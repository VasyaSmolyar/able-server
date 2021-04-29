import OpenAPI from '@tinkoff/invest-openapi-js-sdk';
import express from 'express';
import cors from 'cors';

const apiURL = 'https://api-invest.tinkoff.ru/openapi/sandbox'; // Для Production-окружения будет https://api-invest.tinkoff.ru/openapi
const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
const secretToken = ''; // токен для сандбокса
const api = new OpenAPI({ apiURL, secretToken, socketURL });

const app = express();
app.use(cors());
app.options('*', cors());

const port = 5000

app.get('/candles/:ticker', async (req, res) => {
    try {
        const { figi } = await api.searchOne({ ticker: req.params.ticker });
        const payload = await api.candlesGet({
            figi,
            from: '2019-08-19T18:38:33.131642+03:00',
            to: '2020-08-19T18:38:33.131642+03:00',
            interval: 'day'
        }); // Покупаем AAPL
        res.send(payload);
    } catch (err) {
        res.send(err);
    }
})

app.listen(port, () => {
    console.log(`Backend app listening at http://localhost:${port}`)
})
