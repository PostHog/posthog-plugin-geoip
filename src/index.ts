import { Plugin } from '@posthog/plugin-scaffold'

const plugin: Plugin = {
    processEvent: (event, { geoip }) => {
        if (event.ip) {
            if (event.ip === '127.0.0.1') {
                event.ip = '2.22.230.255'
            }
            const response = geoip.locate(event.ip)
            if (response) {
                if (!event.properties) {
                    event.properties = {}
                }
                if (response.city) {
                    event.properties['$city_name'] = response.city.names?.en
                }
                if (response.country) {
                    event.properties['$country_name'] = response.country.names?.en
                    event.properties['$country_code'] = response.country.isoCode
                }
                if (response.continent) {
                    event.properties['$continent_name'] = response.continent.names?.en
                    event.properties['$continent_code'] = response.continent.code
                }
                if (response.postal) {
                    event.properties['$postal_code'] = response.postal.code
                }
                if (response.location) {
                    event.properties['$latitude'] = response.location?.latitude
                    event.properties['$longitude'] = response.location?.longitude
                    event.properties['$time_zone'] = response.location?.timeZone
                }
                if (response.subdivisions) {
                    for (const [index, subdivision] of response.subdivisions.entries()) {
                        event.properties[`$subdivision_${index + 1}_code`] = subdivision.isoCode
                        event.properties[`$subdivision_${index + 1}_name`] = subdivision.names?.en
                    }
                }
            }
        }
        return event
    },
}

module.exports = plugin
