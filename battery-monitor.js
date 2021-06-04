const ADS1115 = require('ads1115');
const i2c = require('i2c-bus');
const Redis = require('redis');

const redis = Redis.createClient();
require('bluebird').promisifyAll(redis);

i2c.openPromisified(1).then(async (bus) => {
  const ads1115 = await ADS1115(bus)
  // Para un maximo de 3S (4.4*3) = 13.2v, con el divisor es 4.4v y de 2S (4.4*2) = 8.8v, con el divisor es 2.933v
  const vMax = 4.4; // Voltaje minimo por celda
  const vMin = vMax*0.2; // Voltaje minimo por celda
  const Sn = 2; // Numero de celdas de la bateria (2S o 3S)
  const checkBattery = async () => {
    const voltage=(await ads1115.measure('0+GND'))*0.1875*3/1000; // El 3 es por el divisor de voltaje de 1/3, y el 0.1875 es por datasheet, para voltajes maximos de 6.144v
    const remaining = ((voltage/Sn)/vMax)*100; // Cantidad de energia restante, al disminuir del minimo deberia mandar la señal de aterrizaje y recarga
    console.log('Bateria %s - Capacidad %s%%', voltage.toFixed(3), remaining.toFixed(1));
    redis.hmsetAsync('battery', 'voltage', voltage, 'remaining', remaining);
    redis.publishAsync('battery:m', JSON.stringify({voltage, remaining}));
  }

  setInterval(()=>checkBattery(), 1000);
})
