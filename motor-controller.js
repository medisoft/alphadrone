const I2CBus = require('i2c-bus');
const Pca9685Driver = require("pca9685").Pca9685Driver;
const fs = require('fs'), { O_RDWR } = fs.constants;
const Redis = require('redis');


const redis = Redis.createClient(), subscriber=redis.duplicate();
require('bluebird').promisifyAll(redis);

//const MIN = 0.17, MAX=0.48, ZERO = 0.13, FULL = 0.5;
const MIN = 1000, STOP = MIN - 100, MAX = 2300; 

const pausa = async (tout=1000) => new Promise(resolve=>setTimeout(()=>resolve(), tout));

const i2c = I2CBus.openSync(1, O_RDWR);

const opt = {
  i2c,
  address: 0x40,
  frequency: 50, //200,
  debug: true
};


const chn = [0,1,2,3];


const armAll = async (pwm) => {
    console.log('Configuring ESC ranges');
    chn.forEach(c => pwm.setPulseLength(c, MAX*2)); // envia >MAX (2.5ms)
    await pausa(5000);
    chn.forEach(c => pwm.setPulseLength(c, MAX)); // envia MAX (2.5ms)
    await pausa(4000);
    chn.forEach(c => pwm.setPulseLength(c, STOP)); // envia MIN (0.5ms)
    await pausa(1000);
}


// D = PW/T, T=1/f, PW = D*T = D/f
const pwm = new Pca9685Driver(opt, async (err) => {
    if (err) console.log('Error en PWM: ', err)
        
    if(!fs.existsSync('/tmp/armed.tmp')) {
        await armAll(pwm);
        fs.closeSync(fs.openSync('/tmp/armed.tmp', 'w'));
    }
    
    console.log('Starting motor controller');
    
    subscriber.on('message', (channel, message)=>{
        if(channel==='orientation:m') {
            const {gyro, accel, rotation, temp}=JSON.parse(message);
            console.log('G X: %s Y: %s Z: %s', gyro.x.toFixed(4), gyro.y.toFixed(4), gyro.z.toFixed(4))
        }
    });
    subscriber.subscribe('orientation:m');
    
    //chn.forEach(c => pwm.setPulseLength(c, STOP)); // 500 - 2500
/*//     return ;
    for(let i =0.10 ;i<0.45;i+=0.05) {
        console.log('Avanzando a %s', i * 100);
        [0,1,2,3].forEach(c => pwm.setPulseLength(c, MIN*(1 + i)));
        await pausa(5000);
    }
    chn.forEach(c => pwm.setPulseLength(c, STOP)); // 500 - 2500
    return;*/

    // Para programar el rango. Correr este script y luego enseguida enchufar la bateria a los ESC
    /*
    console.log('Configuring ESC ranges');
    chn.forEach(c => pwm.setPulseLength(c, MAX*2)); // envia MAX (2.5ms)
    await pausa(5000);
    chn.forEach(c => pwm.setPulseLength(c, MAX)); // envia MAX (2.5ms)
    await pausa(5000);
    chn.forEach(c => pwm.setPulseLength(c, STOP)); // envia MIN (0.5ms)
      
    console.log('Motors armed');
    await pausa(10000);
    */
    /*
    console.log('Inicializando al minimo');
    chn.forEach(c => pwm.setPulseLength(c, MIN)); // 500 - 2500
    await pausa(10000);
    console.log('Subiendo al maximo');
    chn.forEach(c => pwm.setPulseLength(c, MAX)); // 500 - 2500
    await pausa(2000);
    console.log('Llevando a cero');
    chn.forEach(c => pwm.setPulseLength(c, STOP)); // 500 - 2500
    */
//     await pausa(5000);
//     console.log('Corriendo pruebas');
//     for(let i=MIN; i<=MAX; i+=50) {
//       chn.forEach(c=>pwm.setPulseLength(c, i));
//       await pausa(1000);
//     }
    chn.forEach(c => pwm.setPulseLength(c, STOP)); // 500 - 2500
});



/*(async ()=>{
  console.log('Iniciando');
  //await pwm.setPulseRange(15, 0, 800);
  await pwm.setDutyCycle(15, 0.75);
})()*/
