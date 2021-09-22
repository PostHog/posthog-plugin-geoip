import { City, Reader } from '@maxmind/geoip2-node'
import { Plugin, PluginMeta } from '@posthog/plugin-scaffold'
// @ts-ignore
import { createPageview, resetMeta } from '@posthog/plugin-scaffold/test/utils'
import { join } from 'path'

import * as index from '.'

const { processEvent } = index as Required<Plugin>

const DEFAULT_MMDB_FILE_NAME = 'GeoLite2-City-Test.mmdb'

async function resetMetaWithMmdb(
    transformResult = (res: City) => res as Record<string, any>,
    file = DEFAULT_MMDB_FILE_NAME
): Promise<PluginMeta> {
    const mmdb = await Reader.open(join(__dirname, file))
    return resetMeta({
        geoip: {
            locate: (ipAddress: string) => {
                const res = mmdb.city(ipAddress)
                return transformResult(res)
            },
        },
    }) as PluginMeta
}

test('event is enriched with IP location', async () => {
    const event = await processEvent({ ...createPageview(), ip: '89.160.20.129' }, await resetMetaWithMmdb())
    expect(event!.properties).toEqual(
        expect.objectContaining({
            $geoip_city_name: 'Linköping',
            $geoip_country_name: 'Sweden',
            $geoip_country_code: 'SE',
            $geoip_continent_name: 'Europe',
            $geoip_continent_code: 'EU',
            $geoip_latitude: 58.4167,
            $geoip_longitude: 15.6167,
            $geoip_time_zone: 'Europe/Stockholm',
            $geoip_subdivision_1_code: 'E',
            $geoip_subdivision_1_name: 'Östergötland County',
        })
    )
})

test('person is enriched with IP location', async () => {
    const event = await processEvent({ ...createPageview(), ip: '89.160.20.129' }, await resetMetaWithMmdb())
    expect(event!.$set).toEqual(
        expect.objectContaining({
            $geoip_city_name: 'Linköping',
            $geoip_country_name: 'Sweden',
            $geoip_country_code: 'SE',
            $geoip_continent_name: 'Europe',
            $geoip_continent_code: 'EU',
            $geoip_latitude: 58.4167,
            $geoip_longitude: 15.6167,
            $geoip_time_zone: 'Europe/Stockholm',
            $geoip_subdivision_1_code: 'E',
            $geoip_subdivision_1_name: 'Östergötland County',
        })
    )
    expect(event!.$set_once).toEqual(
        expect.objectContaining({
            $initial_geoip_city_name: 'Linköping',
            $initial_geoip_country_name: 'Sweden',
            $initial_geoip_country_code: 'SE',
            $initial_geoip_continent_name: 'Europe',
            $initial_geoip_continent_code: 'EU',
            $initial_geoip_latitude: 58.4167,
            $initial_geoip_longitude: 15.6167,
            $initial_geoip_time_zone: 'Europe/Stockholm',
            $initial_geoip_subdivision_1_code: 'E',
            $initial_geoip_subdivision_1_name: 'Östergötland County',
        })
    )
})

test('person props default to null if no values present', async () => {
    const removeCityNameFromLookupResult = (res: City) => {
        const { city, ...remainingResult } = res
        return remainingResult
    }
    const event = await processEvent(
        { ...createPageview(), ip: '89.160.20.129' },
        await resetMetaWithMmdb(removeCityNameFromLookupResult)
    )
    expect(event!.$set).toEqual(
        expect.objectContaining({
            $geoip_city_name: null, // default to null
            $geoip_country_name: 'Sweden',
            $geoip_country_code: 'SE',
            $geoip_continent_name: 'Europe',
            $geoip_continent_code: 'EU',
            $geoip_latitude: 58.4167,
            $geoip_longitude: 15.6167,
            $geoip_time_zone: 'Europe/Stockholm',
            $geoip_subdivision_1_code: 'E',
            $geoip_subdivision_1_name: 'Östergötland County',
        })
    )
    expect(event!.$set_once).toEqual(
        expect.objectContaining({
            $initial_geoip_city_name: null, // default to null
            $initial_geoip_country_name: 'Sweden',
            $initial_geoip_country_code: 'SE',
            $initial_geoip_continent_name: 'Europe',
            $initial_geoip_continent_code: 'EU',
            $initial_geoip_latitude: 58.4167,
            $initial_geoip_longitude: 15.6167,
            $initial_geoip_time_zone: 'Europe/Stockholm',
            $initial_geoip_subdivision_1_code: 'E',
            $initial_geoip_subdivision_1_name: 'Östergötland County',
        })
    )
})

test('error is thrown if meta.geoip is not provided', async () => {
    expect.assertions(1)
    await expect(
        async () => await processEvent({ ...createPageview(), ip: '89.160.20.129' }, resetMeta())
    ).rejects.toEqual(
        new Error('This PostHog version does not have GeoIP capabilities! Upgrade to PostHog 1.24.0 or later')
    )
})

test('event is skipped using $geoip_disable', async () => {
    const testEvent = { ...createPageview(), ip: '89.160.20.129', properties: { $geoip_disable: true } }
    const processedEvent = await processEvent(JSON.parse(JSON.stringify(testEvent)), await resetMetaWithMmdb())
    expect(testEvent).toEqual(processedEvent)
})

test('$set optimization works', async () => {
    const meta = await resetMetaWithMmdb()

    const testEvent1 = { ...createPageview(), ip: '89.160.20.129' }
    const processedEvent1 = await processEvent(JSON.parse(JSON.stringify(testEvent1)), meta)
    expect(processedEvent1!.$set).toMatchObject({
        $geoip_city_name: 'Linköping',
        $geoip_country_name: 'Sweden',
        $geoip_country_code: 'SE',
        $geoip_continent_name: 'Europe',
        $geoip_continent_code: 'EU',
        $geoip_latitude: 58.4167,
        $geoip_longitude: 15.6167,
        $geoip_time_zone: 'Europe/Stockholm',
        $geoip_subdivision_1_code: 'E',
        $geoip_subdivision_1_name: 'Östergötland County',
    })

    const testEvent2 = { ...createPageview(), ip: '89.160.20.129', properties: { foo: 'same IP second time' } }
    const processedEvent2 = await processEvent(JSON.parse(JSON.stringify(testEvent2)), meta)
    expect(processedEvent2!.$set).toBeUndefined()
})
