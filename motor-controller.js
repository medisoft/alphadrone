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

let step=0, currentSpeed=STOP, tini;

// D = PW/T, T=1/f, PW = D*T = D/f
const pwm = new Pca9685Driver(opt, async (err) => {
    if (err) console.log('Error en PWM: ', err)
        
    if(!fs.existsSync('/tmp/armed.tmp')) {
        await armAll(pwm);
        fs.closeSync(fs.openSync('/tmp/armed.tmp', 'w'));
    } else {
        chn.forEach(c => pwm.setPulseLength(c, STOP)); // 500 - 2500
    }
    
    console.log('Starting motor controller');
    
    subscriber.on('message', (channel, message)=>{
        if(channel==='orientation:m' &&false) {
            const {gyro, accel, rotation, temp}=JSON.parse(message);
            console.log('G x: %s y: %s z: %s A x: %s y: %s z: %s'
                , gyro.x.toFixed(4), gyro.y.toFixed(4), gyro.z.toFixed(4)
                , accel.x.toFixed(4), accel.y.toFixed(4), accel.z.toFixed(4)
            );
        }
        if(channel==='distance:floor:m') {
            const {floor}=JSON.parse(message);
            console.log('H %scm', floor.toFixed(0));
            if(currentSpeed>MAX || currentSpeed<STOP || step!==3 && new Date().getTime()-tini>10000) {
                console.log('Paro total por que algo fallo');
                chn.forEach(c => pwm.setPulseLength(c, STOP));      
                step=0;
            } else if(step===0) {
                if(floor<10) {
                    console.log('Incrementando potencia: %s', currentSpeed);
                    chn.forEach(c => pwm.setPulseLength(c, currentSpeed));    
                    currentSpeed*=1.01;
                } else step=1;
            } else if(step===1) {
                if(floor>3) {
                    console.log('Reduciendo potencia: %s', currentSpeed);
                    chn.forEach(c => pwm.setPulseLength(c, currentSpeed));                
                    currentSpeed*=0.99;
                } else step=2;
            } else if(step===2) {
                console.log('Paro total');
                chn.forEach(c => pwm.setPulseLength(c, STOP));      
                step=3;
            }
        }
    });
//     subscriber.subscribe('orientation:m');
    subscriber.subscribe('distance:floor:m');
    tini=new Date().getTime();
    
//     pwm.setPulseLength(3, MIN);
//     await pausa(10000);

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
