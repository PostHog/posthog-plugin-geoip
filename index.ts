import { Plugin } from '@posthog/plugin-scaffold'

const plugin: Plugin = {
    processEvent: (event, { geoip }) => {
        if (!geoip) {
            throw new Error('This PostHog version does not have GeoIP capabilities! Upgrade to PostHog 1.24.0 or later')
        }
        if (event.ip) {
            if (event.ip === '127.0.0.1') {
                event.ip = '13.106.122.3'
            }
            const response = geoip.locate(event.ip)
            if (response) {
                if (!event.properties) {
                    event.properties = {}
                }
                if (response.city) {
                    event.properties['$geoip_city_name'] = response.city.names?.en
                }
                if (response.country) {
                    event.properties['$geoip_country_name'] = response.country.names?.en
                    event.properties['$geoip_country_code'] = response.country.isoCode
                }
                if (response.continent) {
                    event.properties['$geoip_continent_name'] = response.continent.names?.en
                    event.properties['$geoip_continent_code'] = response.continent.code
                }
                if (response.postal) {
                    event.properties['$geoip_postal_code'] = response.postal.code
                }
                if (response.location) {
                    event.properties['$geoip_latitude'] = response.location?.latitude
                    event.properties['$geoip_longitude'] = response.location?.longitude
                    event.properties['$geoip_time_zone'] = response.location?.timeZone
                }
                if (response.subdivisions) {
                    for (const [index, subdivision] of response.subdivisions.entries()) {
                        event.properties[`$geoip_subdivision_${index + 1}_code`] = subdivision.isoCode
                        event.properties[`$geoip_subdivision_${index + 1}_name`] = subdivision.names?.en
                    }
                }
            }
        }
        return event
    },
}

module.exports = plugin
