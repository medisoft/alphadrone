const Gpio = require('pigpio').Gpio;
const Redis = require('redis');

const redis = Redis.createClient();
require('bluebird').promisifyAll(redis);

const SPEED_OF_SOUND = 0.03432;

const DistanceMeter = (triggerPin, echoPin) => {
    let currentMeasuringPromise;
  
    this.trigger = new Gpio(triggerPin, {mode: Gpio.OUTPUT});
    this.echo = new Gpio(echoPin, {mode: Gpio.INPUT, alert: true});
    this.trigger.digitalWrite(0);

    const getDistance = async () => {
        if (this.currentMeasuringPromise) {
            return this.currentMeasuringPromise;
        }
        
        this.currentMeasuringPromise = new Promise(async (resolve) => {
            const firstDistance = await readDistance();
            await wait(50);
            const secondDistance = await readDistance();
            await wait(50);
            const thirdDistance = await readDistance();

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
                if (level === 1) {
                    startTick = tick;
                    return;
                }

                const endTick = tick;
                const timeBetweenTicks = (endTick >> 0) - (startTick >> 0);

                const measuredDistance = (timeBetweenTicks / 2) * SPEED_OF_SOUND;

                const distance = measuredDistance > 500 || measuredDistance < 0 ? -1 : measuredDistance;

                resolve(distance);

                this.echo.removeListener('alert', echoListenerCallback);
            };

            this.echo.on('alert', echoListenerCallback);

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

console.log('Tomando medidas');
const dM = DistanceMeter(23, 24); // pin 16 y 18
(async () => {
    while(true) {
        const floor = await dM.getDistance();
        redis.hset('distance', 'floor', floor);
        redis.publish('distance:floor:m', JSON.stringify({floor}));
        console.log('Distancia hacia el piso %scm', floor.toFixed(0));
    }
})();
