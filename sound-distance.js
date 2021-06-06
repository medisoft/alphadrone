const Redis = require('redis');
// const pigpio = require('pigpio-client').pigpio({host: '127.0.0.1'});
const pigpio = require('../pigpio-client').pigpio({host: '127.0.0.1'});
const redis = Redis.createClient();
require('bluebird').promisifyAll(redis);

const SPEED_OF_SOUND = 0.03432;


const ready = new Promise((resolve, reject) => {
  pigpio.once('connected', resolve);
  pigpio.once('error', reject);
});


ready.then(async (info) => {
    const DistanceMeter = (triggerPin, echoPin) => {
        let currentMeasuringPromise;
    
        this.trigger = pigpio.gpio(triggerPin), this.trigger.modeSet('output');        
        this.echo = pigpio.gpio(echoPin), this.echo.modeSet('input');
        this.trigger.write(0);

        const getDistance = async () => {
            if (this.currentMeasuringPromise) {
                return this.currentMeasuringPromise;
            }
                        
            this.currentMeasuringPromise = new Promise(async (resolve) => {
                const firstDistance = await readDistance();
                await wait(45);
                const secondDistance = await readDistance();
                await wait(45);
                const thirdDistance = await readDistance();
                await wait(10);

                const totalDistance = firstDistance + secondDistance + thirdDistance
                - Math.max(firstDistance, secondDistance, thirdDistance)
                - Math.min(firstDistance, secondDistance, thirdDistance);

                this.currentMeasuringPromise = undefined;

                resolve(totalDistance);
            });

            return this.currentMeasuringPromise;
        }

        const readDistance = async () => {
            return new Promise((resolve) => {
                let startTick;

                const echoListenerCallback = (level, tick) => {
                    if(level === null || tick === null || tick === 0) return;
                    if (level === 1) {
                        startTick = tick;
                        return;
                    }

                    const endTick = tick;
                    const timeBetweenTicks = (endTick >> 0) - (startTick >> 0);

                    const measuredDistance = (timeBetweenTicks / 2) * SPEED_OF_SOUND;

                    const distance = measuredDistance > 500 || measuredDistance < 0 ? -1 : measuredDistance;

                    resolve(distance);

                    this.echo.endNotify(echoListenerCallback);
                };
                this.echo.notify(echoListenerCallback);
                
                this.trigger.trigger(10, 1);
            });
        }

        const wait = async (ms) => {
            return new Promise((resolve) => {
                setTimeout(resolve, ms);
            });
        }
        
        return {
            getDistance
        };
    }

    const dM = DistanceMeter(23, 24); // pin 16 y 18

    while(true) {
        const floor = await dM.getDistance();
        redis.hset('distance', 'floor', floor);
        redis.publish('distance:floor:m', JSON.stringify({floor}));
        console.log('Distancia hacia el piso %scm', floor.toFixed(0));
    }
}).catch(console.error);
