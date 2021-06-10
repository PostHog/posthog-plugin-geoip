import { Plugin } from '@posthog/plugin-scaffold'

const plugin: Plugin = {
    processEvent: async (event, { geoip, storage }) => {
        if (!geoip) {
            throw new Error('This PostHog version does not have GeoIP capabilities! Upgrade to PostHog 1.24.0 or later')
        }
        if (event.ip) {
            const lastIpSet = await storage.get(event.distinct_id, null)
            if (typeof lastIpSet === 'string') {
                const [ip, timestamp] = lastIpSet.split('|')
                if (ip === event.ip) {
                    return event
                }
                if (event.timestamp && timestamp) {
                    if (new Date(event.timestamp) < new Date(timestamp)) {
                        return event
                    }
                }
            }
            if (event.ip === '127.0.0.1') {
                event.ip = '13.106.122.3' // Spoofing an Australian IP address for local development
            }
            const response = await geoip.locate(event.ip)
            if (response) {
                const location: Record<string, any> = {}
                if (response.city) {
                    location['city_name'] = response.city.names?.en
                }
                if (response.country) {
                    location['country_name'] = response.country.names?.en
                    location['country_code'] = response.country.isoCode
                }
                if (response.continent) {
                    location['continent_name'] = response.continent.names?.en
                    location['continent_code'] = response.continent.code
                }
                if (response.postal) {
                    location['postal_code'] = response.postal.code
                }
                if (response.location) {
                    location['latitude'] = response.location?.latitude
                    location['longitude'] = response.location?.longitude
                    location['time_zone'] = response.location?.timeZone
                }
                if (response.subdivisions) {
                    for (const [index, subdivision] of response.subdivisions.entries()) {
                        location[`subdivision_${index + 1}_code`] = subdivision.isoCode
                        location[`subdivision_${index + 1}_name`] = subdivision.names?.en
                    }
                }

                if (!event.properties) {
                    event.properties = {}
                }
                if (!event.$set) {
                    event.$set = {}
                }
                if (!event.$set_once) {
                    event.$set_once = {}
                }

                for (const [key, value] of Object.entries(location)) {
                    event.properties[`$geoip_${key}`] = value
                    event.$set[`$geoip_${key}`] = value
                    event.$set_once[`$initial_geoip_${key}`] = value
                }
            }
        }
        await storage.set(event.distinct_id, `${event.ip}|${event.timestamp}`)
        return event
    },
}

module.exports = plugin
