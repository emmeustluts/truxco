const { Output: GooglePlacesOutput } = require('../../dtos/GooglePlaces.dto');

const request = require('supertest');

describe('GET https://api.beebus.live/client/google-places?input=London', () => {
  it('should return status 200 and match expected structure', async () => {
    const res = await request('https://api.beebus.live')
      .get('/client/google-places?input=London')
      .set({"Referer":"https://travelmax.beebus.live/","User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36","sec-ch-ua":"\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"","sec-ch-ua-mobile":"?0","sec-ch-ua-platform":"\"Linux\""})
      ;

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(GooglePlacesOutput);
  });
});