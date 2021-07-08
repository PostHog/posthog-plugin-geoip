import { Plugin } from '@posthog/plugin-scaffold'

const ONE_DAY = 60 * 60 * 24 // 24h in seconds

const plugin: Plugin = {
    processEvent: async (event, { geoip, cache }) => {
        if (!geoip) {
            throw new Error('This PostHog version does not have GeoIP capabilities! Upgrade to PostHog 1.24.0 or later')
        }
        if (event.ip) {
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

                let setUserProps = true

                const lastIpSet = await cache.get(event.distinct_id, null)
                if (typeof lastIpSet === 'string') {
                    const [ip, timestamp] = lastIpSet.split('|')

                    // new ip but this event is late and another event that happened
                    // after but was received earlier already updated the props
                    const isEventSettingPropertiesLate =
                        event.timestamp && timestamp && new Date(event.timestamp) < new Date(timestamp)

                    // same ip as is currently set on the person
                    const isSameIp = ip === event.ip
                    if (isSameIp || isEventSettingPropertiesLate) {
                        setUserProps = false
                    }
                }

                for (const [key, value] of Object.entries(location)) {
                    event.properties[`$geoip_${key}`] = value
                    if (setUserProps) {
                        if (!event.$set) {
                            event.$set = {}
                        }
                        if (!event.$set_once) {
                            event.$set_once = {}
                        }
                        event.$set[`$geoip_${key}`] = value
                        event.$set_once[`$initial_geoip_${key}`] = value
                        await cache.set(event.distinct_id, `${event.ip}|${event.timestamp || ''}`, ONE_DAY)
                    }
                }
            }
        }
        return event
    },
}

module.exports = plugin
