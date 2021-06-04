const MPU6050 = require('i2c-mpu6050');
const I2C = require('i2c-bus');
const fs = require('fs'), { O_RDWR } = fs.constants;
const Redis = require('redis');

const redis = Redis.createClient();
require('bluebird').promisifyAll(redis);
const address = 0x68;

const i2c = I2C.openSync(1);
const sensor = new MPU6050(i2c, address);
 
const checkOrientation = async () => {
    const data = sensor.readSync();
    console.log(data);
    redis.hmsetAsync('orientation'
        , 'gyro_x', data.gyro.x
        , 'gyro_y', data.gyro.x
        , 'gyro_z', data.gyro.x
        , 'accel_x', data.accel.x
        , 'accel_y', data.accel.x
        , 'accel_z', data.accel.x
        , 'rotation_x', data.rotation.x
        , 'rotation_y', data.rotation.x
        , 'temp', data.temp
        
    );
    redis.publishAsync('orientation:m', JSON.stringify(data));
}


setInterval(()=>checkOrientation(), 100);
