import OpenAPI from '@tinkoff/invest-openapi-js-sdk';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { server } from 'websocket';

const apiURL = 'https://api-invest.tinkoff.ru/openapi/sandbox'; // Для Production-окружения будет https://api-invest.tinkoff.ru/openapi
const socketURL = 'wss://api-invest.tinkoff.ru/openapi/md/v1/md-openapi/ws';
const secretToken = 't.hGeyci0o8BDXyi37Fs2GsqBFOXV6iBwJFChPHiIeSjlgO7sj9Xc99vbbRQJxb6rJIeIwAvKvO4xWPMXxhJty0A'; // токен для сандбокса
const api = new OpenAPI({ apiURL, secretToken, socketURL });

const app = express();
app.use(cors());
app.options('*', cors());

const port = 5000;

var httpServer = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

httpServer.listen(5001, function() {
    console.log('WebSocket server is listening on port 5001');
});

var wsServer = new server({
    httpServer: httpServer,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept('on-update', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    var fin = null;

    connection.on('message', async function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            var args = message.utf8Data.split('/');
            // Простейший роутинг
            if(args[0] === 'candles') {
                if(args[1]) {
                    const { figi } = await api.searchOne({ ticker: args[1] });
                    const unsub = await api.candle({figi: figi, interval: "day"}, (stream) => {
                        connection.sendUTF(JSON.stringify(stream));
                    });
                    if (fin) {
                        fin();
                    }
                    fin = unsub;
                }
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            //connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

app.get('/candles/:ticker', async (req, res) => {
    try {
        const { figi } = await api.searchOne({ ticker: req.params.ticker });

        var d = new Date();
        d.setDate(d.getDate() - 1); // Yesterday!
        var ys = new Date();
        ys.setFullYear(ys.getFullYear() - 1);

        const payload = await api.candlesGet({
            figi,
            from: ys.toISOString(),
            to: d.toISOString(),
            interval: 'day'
        });

        res.send(payload);
    } catch (err) {
        res.send(err);
    }
})

app.get('/list/:ticker', async (req, res) => {
    try {
        const stocks = await api.stocks();
        const bonds = await api.bonds();
        const etfs = await api.etfs();
        const all = stocks.instruments.concat(bonds.instruments, etfs.instruments);

        const payload = all.filter((figi) => {
            return figi.ticker.startsWith(req.params.ticker.toUpperCase());
        });
        
        res.send(payload);
    } catch (err) {
        res.send(err);
    }
});

app.listen(port, () => {
    console.log(`Backend app listening at http://localhost:${port}`)
})
