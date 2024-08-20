import { Plugin } from '@posthog/plugin-scaffold'

const props = {
    city_name: null,
    city_confidence: null,
    subdivision_2_name: null,
    subdivision_2_code: null,
    subdivision_2_confidence: null,
    subdivision_1_name: null,
    subdivision_1_code: null,
    subdivision_1_confidence: null,
    country_name: null,
    country_code: null,
    country_confidence: null,
    continent_name: null,
    continent_code: null,
    postal_code: null,
    postal_code_confidence: null,
    latitude: null,
    longitude: null,
    accuracy_radius: null,
    time_zone: null,
}

const defaultLocationSetProps = Object.entries(props).reduce((acc, [key]) => {
    acc[`$geoip_${key}`] = null
    return acc
}, {} as Record<string, any>)


const defaultLocationSetOnceProps = Object.entries(props).reduce((acc, [key]) => {
    acc[`$initial_geoip_${key}`] = null
    return acc
}, {} as Record<string, any>)



const plugin: Plugin = {
    processEvent: async (event, { geoip }) => {
        if (!geoip) {
            throw new Error('This PostHog version does not have GeoIP capabilities! Upgrade to PostHog 1.24.0 or later')
        }
        let ip = event.properties?.$ip || event.ip
        if (ip && !event.properties?.$geoip_disable) {
            ip = String(ip)
            if (ip === '127.0.0.1') {
                ip = '13.106.122.3' // Spoofing an Australian IP address for local development
            }
            const response = await geoip.locate(ip)
            if (response) {
                const location: Record<string, any> = {}
                if (response.city) {
                    location['city_name'] = response.city.names?.en
                    location['city_confidence'] = response.city.confidence ?? null
                }
                if (response.country) {
                    location['country_name'] = response.country.names?.en
                    location['country_code'] = response.country.isoCode
                    location['country_confidence'] = response.country.confidence ?? null
                }
                if (response.continent) {
                    location['continent_name'] = response.continent.names?.en
                    location['continent_code'] = response.continent.code
                }
                if (response.postal) {
                    location['postal_code'] = response.postal.code
                    location['postal_code_confidence'] = response.postal.confidence ?? null
                }
                if (response.location) {
                    location['latitude'] = response.location?.latitude
                    location['longitude'] = response.location?.longitude
                    location['accuracy_radius'] = response.location?.accuracyRadius
                    location['time_zone'] = response.location?.timeZone
                }
                if (response.subdivisions) {
                    for (const [index, subdivision] of response.subdivisions.entries()) {
                        location[`subdivision_${index + 1}_code`] = subdivision.isoCode
                        location[`subdivision_${index + 1}_name`] = subdivision.names?.en
                        location[`subdivision_${index + 1}_confidence`] = subdivision.confidence ?? null
                    }
                }

                if (!event.properties) {
                    event.properties = {}
                }

                if (!event.properties.$set) {
                    event.properties.$set = {}
                }
                if (!event.properties.$set_once) {
                    event.properties.$set_once = {}
                }
                event.properties.$set = { ...defaultLocationSetProps, ...(event.properties.$set ?? {}) }
                event.properties.$set_once = {
                    ...defaultLocationSetOnceProps,
                    ...(event.properties.$set_once ?? {}),
                }

                for (const [key, value] of Object.entries(location)) {
                    event.properties[`$geoip_${key}`] = value
                    event.properties.$set![`$geoip_${key}`] = value
                    event.properties.$set_once![`$initial_geoip_${key}`] = value
                }
            }
        }
        return event
    },
}

module.exports = plugin
