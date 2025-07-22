const { Output: PaymentMethodBreakdownOutput } = require('../../dtos/PaymentMethodBreakdown.dto');

const request = require('supertest');

describe('GET https://api.beebus.live/reports/payment-method-breakdown?lang=en', () => {
  it('should return status 200 and match expected structure', async () => {
    const res = await request('https://api.beebus.live')
      .get('/reports/payment-method-breakdown?lang=en')
      .set({"Referer":"https://travelmax.beebus.live/","User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36","authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZnVsbG5hbWUiOiI1NzQzZDZiNGU1NzZjZTI1OWI5NGE3ZTc0NGZlZTUyMjpjNzAxNDRlMzUxM2QyZWE1YzAxM2U0ZjZlOTdjZGQzNyIsImVtYWlsIjoiYWRtaW4xQHRyYXZlbG1heC5jb20iLCJ1c2VybmFtZSI6IjI2OWM4ZDk0ZjgxYzc5YzQyOWJiZjdhMjU2ZTdlYzkxOmVmNWE4NWJiM2ZmNTIzMTM5ZTg2OWM5NzdhNjVlNTBkNTQwNjU1ODkyZTg4ZmRlYzI2NWZjMmMxNjcyOWE5MzYiLCJyb2xlIjoiQWRtaW4iLCJzdGF0dXMiOiJBY3RpdmUiLCJjcmVhdGVkQnkiOiIxIiwiYWdlbmN5SWQiOjIsImlhdCI6MTc1MzE3MTEzMCwiZXhwIjoxNzUzMjE0MzMwfQ.Ldtrj4ykStxDdM1gqlPf0IST7X75K3A8mLWpci5_vkE","sec-ch-ua":"\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"","sec-ch-ua-mobile":"?0","sec-ch-ua-platform":"\"Linux\""})
      ;

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(PaymentMethodBreakdownOutput);
  });
});