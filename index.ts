import { Plugin } from '@posthog/plugin-scaffold'

const ONE_DAY = 60 * 60 * 24 // 24h in seconds

const defaultLocationSetProps = {
    $geoip_city_name: null,
    $geoip_country_name: null,
    $geoip_country_code: null,
    $geoip_continent_name: null,
    $geoip_continent_code: null,
    $geoip_postal_code: null,
    $geoip_latitude: null,
    $geoip_longitude: null,
    $geoip_time_zone: null,
}

const defaultLocationSetOnceProps = {
    $initial_geoip_city_name: null,
    $initial_geoip_country_name: null,
    $initial_geoip_country_code: null,
    $initial_geoip_continent_name: null,
    $initial_geoip_continent_code: null,
    $initial_geoip_postal_code: null,
    $initial_geoip_latitude: null,
    $initial_geoip_longitude: null,
    $initial_geoip_time_zone: null,
}

const plugin: Plugin = {
    processEvent: async (event, { geoip, cache }) => {
        if (!geoip) {
            throw new Error('This PostHog version does not have GeoIP capabilities! Upgrade to PostHog 1.24.0 or later')
        }
        let ip = event.properties?.$ip || event.ip
        if (ip && !event.properties?.$geoip_disable) {
            ip = String(ip)
            if (ip === '127.0.0.1') {
                ip = '13.106.122.3' // Spoofing an Australian IP address for local development
            }
            var response = await cache.get(ip, false)
            if (!response) {
                response = await geoip.locate(ip)
                await cache.set(ip, JSON.stringify(response))
            } else {
                response = JSON.parse(response)
            }
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

                let setPersonProps = true

                const lastIpSetEntry = await cache.get(event.distinct_id, null)
                if (typeof lastIpSetEntry === 'string') {
                    const [lastIpSet, timestamp] = lastIpSetEntry.split('|')

                    // New IP but this event is late and another event that happened after
                    // but was received earlier has already updated the props
                    const isEventSettingPropertiesLate =
                        event.timestamp && timestamp && new Date(event.timestamp) < new Date(timestamp)

                    // Person props update is not needed if the event's IP is the same as last set for the person
                    if (lastIpSet === ip || isEventSettingPropertiesLate) {
                        setPersonProps = false
                    }
                }

                if (setPersonProps) {
                    event.$set = { ...defaultLocationSetProps, ...(event.$set ?? {}) }
                    event.$set_once = {
                        ...defaultLocationSetOnceProps,
                        ...(event.$set_once ?? {}),
                    }
                }

                for (const [key, value] of Object.entries(location)) {
                    event.properties[`$geoip_${key}`] = value
                    if (setPersonProps) {
                        event.$set![`$geoip_${key}`] = value
                        event.$set_once![`$initial_geoip_${key}`] = value
                        await cache.set(event.distinct_id, `${ip}|${event.timestamp || ''}`, ONE_DAY)
                    }
                }
            }
        }
        return event
    },
}

module.exports = plugin
