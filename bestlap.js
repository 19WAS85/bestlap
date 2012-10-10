var MAX_QUALITY = 100;
var MIN_QUALITY = 1;
var METERS_PER_SECOND_COEF = 0.277;
var METERS_PER_CHECKPOINT = 1000;
var LOSS_QUALITY_COEF = -0.0012;
var CHECKPOINT_TIME_VAR_COEF = 0.04;
var OVERTAKE_DIFICULT_COEF = 0.8;
var TOTAL_FAIL_INDEX = 0.2;
var FAIL_INDEX = 1;
var MAX_FAIL_TIME = 45;

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
    this.out = false;
    
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

function Lap(track, raceDriver, diffTime) {
    this.track = track;
    this.raceDriver = raceDriver;
    this.diffTime = diffTime;
    
    this.metersPerSecond = this.raceDriver.car.speed * METERS_PER_SECOND_COEF;
    this.best = this.track.meters / (this.metersPerSecond * this.track.factor);
    this.bestCheckpoint = this.best / this.track.checkpoints;
    this.qualityLossPerSecond = (this.raceDriver.quality - MAX_QUALITY) * LOSS_QUALITY_COEF;
    this.qualityLoss = this.qualityLossPerSecond * this.bestCheckpoint;
    this.checkpointVar = this.bestCheckpoint * CHECKPOINT_TIME_VAR_COEF;
    
    this.execute = function() {
        var time = 0 + this.diffTime;
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
    
    this.racePositionSort = function(a, b) {
        var lapsCompletedDiff = b.lapsCompleted() - a.lapsCompleted();
        if (lapsCompletedDiff == 0) return a.totalTime() - b.totalTime();
        else return lapsCompletedDiff;
    }
    
    this.refresh = function() {
        this.positions = this.race.drivers.sort(this.racePositionSort);
        this.first = this.positions[0];
        this.lapsCompleted = this.first.lapsCompleted();
        this.totalTime = this.first.totalTime();
        for (var i = 0; i < this.positions.length; i++) {
            var raceDriver = this.positions[i];
            var driverTotalTime = raceDriver.totalTime();
            raceDriver.position = i + 1;
            raceDriver.diff = driverTotalTime - this.totalTime;
            raceDriver.frontDiff = 0;
            if (i > 0) {
                var frondDriverTotalTime = this.positions[i - 1].totalTime();
                raceDriver.frontDiff = driverTotalTime - frondDriverTotalTime;
            }
        }
    }
}

function OvertakeControl(raceDriver, frontRaceDriver) {
    this.raceDriver = raceDriver;
    this.frontRaceDriver = frontRaceDriver;
    this.lapIndex = this.raceDriver.lapsCompleted() - 1;
    
    this.execute = function() {
        var totalTime = this.raceDriver.totalTime();
        var frontTotalTime = this.frontRaceDriver.totalTime();
        if (totalTime > frontTotalTime) return false;
        
        var quality = Math.random() * this.raceDriver.quality;
        var frontQuality = Math.random() * this.frontRaceDriver.quality;
        if (this.lapIndex > 0) frontQuality *= OVERTAKE_DIFICULT_COEF;
        if(quality < frontQuality) {
            var frontLapTime = this.frontRaceDriver.lapTimes[this.lapIndex];
            var newLapTime = new LapTime(frontLapTime.seconds + 0.1);
            this.raceDriver.lapTimes[this.lapIndex] = newLapTime;
            return false;
        } else return true;
    }
}

function LapControl(raceDriver, firstRaceDriver) {
    this.raceDriver = raceDriver;
    this.firstRaceDriver = firstRaceDriver;
    
    this.execute = function() {
        var totalTime = this.raceDriver.totalTime();
        var firstTotalTime = this.firstRaceDriver.totalTime();
        var timeDiff = totalTime - firstTotalTime;
        return timeDiff > 0;
    }
}

function FailControl(raceDriver) {
    this.raceDriver = raceDriver;
    
    this.execute = function() {
        var driverFailIndex = Math.random() * this.raceDriver.quality;
        var failTime = 0;
        if (driverFailIndex < TOTAL_FAIL_INDEX) {
            raceDriver.out = true;
        } else if (driverFailIndex < FAIL_INDEX) {
            failTime = Math.random() * MAX_FAIL_TIME;
        }
        this.raceDriver.failLap = failTime > 0;
        return failTime;
    }
}

function Race(name, track, laps) {
    this.name = name;
    this.track = track;
    this.totalLaps = laps;
    this.lapsLeft = laps;
    this.drivers = [];
    this.status = new RaceStatus(this);
    
    this.createLapTime = function(raceDriver, failTime) {
        var lap = new Lap(this.track, raceDriver, failTime);
        var seconds = lap.execute();
        return new LapTime(seconds);
    }
    
    this.next = function() {
        if (this.over()) return;
        var positions = this.status.positions;
        for (var i = 0; i < positions.length; i++) {
            if (positions[i].out) continue;
            
            if (!positions[0].out) {
                var lapControl = new LapControl(positions[i], positions[0]);
                var lapLeft = lapControl.execute();
                if (lapLeft) continue;
            }
            
            var fail = new FailControl(positions[i]);
            var failTime = fail.execute();
            if (positions[i].out) continue;
            
            var lapTime = this.createLapTime(positions[i], failTime);
            positions[i].lapTimes.push(lapTime);
            
            for (var j = i - 1; j >= 0; j--) {
                if (positions[j].out || positions[j].failLap) continue;
                var overtake = new OvertakeControl(positions[i], positions[j]);
                var overtakeSuccess = overtake.execute();
                if (!overtakeSuccess) break;
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