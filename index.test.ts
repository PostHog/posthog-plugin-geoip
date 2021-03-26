import { Plugin, PluginMeta } from '@posthog/plugin-scaffold'
// @ts-ignore
import { createPageview, resetMeta } from '@posthog/plugin-scaffold/test/utils'
import { join } from 'path'
import { Reader } from '@maxmind/geoip2-node'
import * as index from '.'

const { processEvent } = index as Required<Plugin>

async function resetMetaWithMmdb(file = 'GeoLite2-City-Test.mmdb'): Promise<PluginMeta> {
    const mmdb = await Reader.open(join(__dirname, file))
    return resetMeta({
        geoip: {
            locate: (ipAddress: string) => mmdb.city(ipAddress),
        },
    }) as PluginMeta
}

test('GeoLite2-City', async () => {
    const event = await processEvent({ ...createPageview(), ip: '89.160.20.129' }, await resetMetaWithMmdb())
    expect(event!.properties).toEqual(
        expect.objectContaining({
            $city_name: 'Linköping',
            $country_name: 'Sweden',
            $country_code: 'SE',
            $continent_name: 'Europe',
            $continent_code: 'EU',
            $latitude: 58.4167,
            $longitude: 15.6167,
            $time_zone: 'Europe/Stockholm',
            $subdivision_1_code: 'E',
            $subdivision_1_name: 'Östergötland County',
        })
    )
})
