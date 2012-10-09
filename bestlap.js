var MAX_QUALITY = 100;
var MIN_QUALITY = 1;
var METERS_PER_SECOND_COEF = 0.277;
var METERS_PER_CHECKPOINT = 1000;
var LOSS_QUALITY_COEF = -0.0012;
var CHECKPOINT_TIME_VAR_COEF = 0.04;

function LapTime(seconds) {
    this.seconds = seconds;
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
    this.factor = factor;
    this.checkpoints = Math.ceil(this.meters / METERS_PER_CHECKPOINT);
}

function Car(name, quality, speed) {
    this.name = name;
    this.quality = Util.limit(quality);
    this.speed = speed;
}

function Driver(name, quality) {
    this.name = name;
    this.quality = Util.limit(quality);
}

function Category(name, qualityVariation) {
    this.name = name;
    this.qualityVariation = qualityVariation;
    
    this.variation = function(quality) {
        var random = Math.random() * this.qualityVariation * 2;
        var variation = random - this.qualityVariation + quality;
        return Util.limit(variation);
    }
}

function RaceDriver(driver, car, category) {
    this.car = car;
    this.driver = driver;
    this.category = category;
    this.lapTimes = [];
    this.qualityBase = Util.average([ driver.quality, car.quality ]);
    this.quality = category.variation(this.qualityBase);
    
    this.lapsCompleted = function() {
        return this.lapTimes.length;
    }
    
    this.totalTime = function() {
        var time = 0;
        for (var i = 0; i < this.lapsCompleted(); i++) {
            time += this.lapTimes[i].seconds;
        }
        return time;
    }
}

function Lap(track, raceDriver) {
    this.track = track;
    this.raceDriver = raceDriver;
    
    this.metersPerSecond = this.raceDriver.car.speed * METERS_PER_SECOND_COEF;
    this.best = this.track.meters / (this.metersPerSecond * this.track.factor);
    this.bestCheckpoint = this.best / this.track.checkpoints;
    this.qualityLossPerSecond = (this.raceDriver.quality - MAX_QUALITY) * LOSS_QUALITY_COEF;
    this.qualityLoss = this.qualityLossPerSecond * this.bestCheckpoint;
    this.checkpointVar = this.bestCheckpoint * CHECKPOINT_TIME_VAR_COEF;
    
    this.execute = function() {
        var time = 0;
        for (var i = 0; i < this.track.checkpoints; i++) {
            var randLoss = this.checkpointVar * Math.random();
            var checkpointTime = this.bestCheckpoint + this.qualityLoss + randLoss;
            time += checkpointTime;
        }
        return time;
    }
}

function RaceStatus(race) {
    this.race = race;
    this.positions = this.race.drivers;
    
    this.lessTotalTime = function(a, b) {
        return a.totalTime() - b.totalTime();
    }
    
    this.refresh = function() {
        this.positions = this.race.drivers.sort(this.lessTotalTime);
        this.first = this.positions[0];
        this.lapsCompleted = this.first.lapsCompleted();
        this.totalTime = this.first.totalTime();
        for (var i = 0; i < this.positions.length; i++) {
            var raceDriver = this.positions[i];
            raceDriver.position = i + 1;
            raceDriver.diff = raceDriver.totalTime() - this.totalTime;
        }
    }
}

function Overtake(raceDriver, frontRaceDriver) {
    this.raceDriver = raceDriver;
    this.frontRaceDriver = frontRaceDriver;
    this.lapIndex = this.raceDriver.lapsCompleted() - 1;
    
    this.execute = function() {
        var totalTime = this.raceDriver.totalTime();
        var frontTotalTime = this.frontRaceDriver.totalTime();
        if (totalTime > frontTotalTime) return;
        
        var quality = Math.random() * this.raceDriver.quality;
        var frontQuality = Math.random() * this.raceDriver.quality;
        if (this.lapIndex > 0) frontQuality *= 2;
        if(quality < frontQuality) {
            var frontLapTime = this.frontRaceDriver.lapTimes[this.lapIndex];
            var newLapTime = new LapTime(frontLapTime.seconds + 0.1);
            this.raceDriver.lapTimes[this.lapIndex] = newLapTime;
        }
    }
}

function Race(name, track, laps) {
    this.name = name;
    this.track = track;
    this.totalLaps = laps;
    this.lapsLeft = laps;
    this.drivers = [];
    this.status = new RaceStatus(this);
    
    this.createLapTime = function(raceDriver) {
        var lap = new Lap(this.track, raceDriver);
        var seconds = lap.execute();
        return new LapTime(seconds);
    }
    
    this.next = function() {
        if (this.over()) return;
        var positions = this.status.positions;
        for (var i = 0; i < positions.length; i++) {
            var lapTime = this.createLapTime(positions[i]);
            positions[i].lapTimes.push(lapTime);
            if (i > 0) {
                var overtake = new Overtake(positions[i], positions[i - 1]);
                overtake.execute();
            }
        }
        this.lapsLeft--;
        this.status.refresh();
        return this.status;
    }
    
    this.over = function() {
        return this.lapsLeft < 0;
    }
}

var Util = {
    
    limit: function(quality) {
        if (quality < MIN_QUALITY) return MIN_QUALITY;
        else if (quality > MAX_QUALITY) return MAX_QUALITY;
        else return quality;
    },
    
    average: function(values) {
        var total = 0;
        for (var i = 0; i < values.length; i++) {
            total += values[i];
        }
        return total / values.length;
    }
    
}