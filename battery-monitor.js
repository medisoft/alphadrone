const ADS1115 = require('ads1115');
const i2c = require('i2c-bus');
const Redis = require('redis');
const exec = require('child_process').exec;

const CELL_VOLTAGE = 4.2;

const redis = Redis.createClient();
require('bluebird').promisifyAll(redis);

i2c.openPromisified(1).then(async (bus) => {
  const ads1115 = await ADS1115(bus)
  // Para un maximo de 3S (CELL_VOLTAGE*3) = 13.2v, con el divisor es CELL_VOLTAGEv y de 2S (CELL_VOLTAGE*2) = 8.8v, con el divisor es 2.933v
  const vMax = CELL_VOLTAGE; // Voltaje maximo teorico por celda
  const vMin = vMax*0.84; // Voltaje minimo de seguridad por celda https://www.cnydrones.org/lipo-batteries-and-safety-for-beginners/
  let Sn = 2; // Numero de celdas de la bateria (2S o 3S)
  const checkBattery = async () => {
    const voltage=(await ads1115.measure('0+GND'))*0.1875*3/1000; // El 3 es por el divisor de voltaje de 1/3, y el 0.1875 es por datasheet, para voltajes maximos de 6.144v
    if(vMax*Sn<voltage) Sn++;
    //const remaining = ((voltage/Sn)/vMax)*100; // Cantidad de energia restante, al disminuir del minimo deberia mandar la señal de aterrizaje y recarga
    const remaining = (vMax-voltage/Sn)/(vMax-vMin)*100;
    console.log('Bateria %sS %sv (%sv x celda - %sv minimo) - Capacidad %s%%', Sn, voltage.toFixed(3), (voltage/Sn).toFixed(3), vMin.toFixed(3), remaining.toFixed(1));
    redis.hmsetAsync('battery', 'voltage', voltage, 'remaining', remaining);
    redis.publishAsync('battery:m', JSON.stringify({voltage, remaining}));
    if(remaining<=10 && new Date().getSeconds()===0) exec(`wall "Battery level warning ${voltage.toFixed(3)}v ${remaining.toFixed(1)}%"`);
  }

  setInterval(()=>checkBattery(), 1000);
})
