var MAX_QUALITY = 100;
var METERS_PER_SECOND_COEF = 0.277;
var METERS_PER_CHECKPOINT = 1000;
var LOSS_QUALITY_COEF = -0.0012;
var CHECKPOINT_TIME_VAR_COEF = 0.04;

function LapTime(seconds) {
    this.milliseconds = seconds * 1000;
    this.date = new Date(this.milliseconds);
    
    this.format = function() {
        return this.date.getMinutes() + ":" +
            this.date.getSeconds() + ":" +
            this.date.getMilliseconds();
    }
}

function Track(name, meters, factor) {
    this.name = name;
    this.meters = meters;
    this.checkpoints = Math.ceil(this.meters / METERS_PER_CHECKPOINT);
    this.factor = factor;
}

function Car(name, quality, speed) {
    this.name = name;
    this.quality = quality;
    this.speed = speed;
}

function Driver(name, quality) {
    this.name = name;
    this.quality = quality;
}

function Lap(track, car, driver) {
    this.track = track;
    this.car = car;
    this.driver = driver;
    
    this.metersPerSecond = this.car.speed * METERS_PER_SECOND_COEF;
    this.best = this.track.meters / (this.metersPerSecond * this.track.factor);
    this.bestCheckpoint = this.best / this.track.checkpoints;
    this.quality = (this.car.quality + this.driver.quality) / 2;
    this.qualityLossPerSecond = (this.quality - MAX_QUALITY) * LOSS_QUALITY_COEF;
    this.qualityLoss = this.qualityLossPerSecond * this.bestCheckpoint;
    this.checkpointVar = this.bestCheckpoint * CHECKPOINT_TIME_VAR_COEF;
    
    this.execute = function() {
        var time = 0;
        for(var i = 0; i < this.track.checkpoints; i++) {
            var randLoss = this.checkpointVar * Math.random();
            var checkpointTime = this.bestCheckpoint + this.qualityLoss + randLoss;
            time += checkpointTime;
        }
        return time;
    }
}