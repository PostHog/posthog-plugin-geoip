// @ts-ignore
import { createPageview, clone } from '@posthog/plugin-scaffold/test/utils'

// import { processEvent } from '..'

// test('setupPlugin and processEvent with no DB', async () => {
//     const pageviewEvent = createPageview()
//     const processedPageviewEvent = await processEvent(clone(pageviewEvent))
//     expect(processedPageviewEvent).toEqual(pageviewEvent)
// })

// test('GeoLite2-City', async () => {
//     const event = await processEvent({ ...createPageview(), ip: '89.160.20.129' })
//     expect(event!.properties).toEqual(
//         expect.objectContaining({
//             $city_name: 'Linköping',
//             $country_name: 'Sweden',
//             $country_code: 'SE',
//             $continent_name: 'Europe',
//             $continent_code: 'EU',
//             $latitude: 58.4167,
//             $longitude: 15.6167,
//             $time_zone: 'Europe/Stockholm',
//             $subdivision_1_code: 'E',
//             $subdivision_1_name: 'Östergötland County',
//         })
//     )
// })

// test('GeoIP2-City', async () => {
//     const event = await processEvent({ ...createPageview(), ip: '89.160.20.129' })
//     expect(event!.properties).toEqual(
//         expect.objectContaining({
//             $city_name: 'Linköping',
//             $country_name: 'Sweden',
//             $country_code: 'SE',
//             $continent_name: 'Europe',
//             $continent_code: 'EU',
//             $latitude: 58.4167,
//             $longitude: 15.6167,
//             $time_zone: 'Europe/Stockholm',
//             $subdivision_1_code: 'E',
//             $subdivision_1_name: 'Östergötland County',
//         })
//     )
// })
