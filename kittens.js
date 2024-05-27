const RoboKittens = {
    UNOBTAINIUM_PER_LEVIATHAN_TRADE: 5000,
    /*
     * Status of the game
     */
    getAmountFromDisplay(display) {
        const rawAmount = parseFloat(display.replace(/[^0-9\.\+-]/g, ''), 10);
        const powersMap = {
            'K': 3 * 1,
            'M': 3 * 2,
            'G': 3 * 3,
            'T': 3 * 4,
            'P': 3 * 5,
            'E': 3 * 6,
            'Z': 3 * 7,
            'Y': 3 * 8,
            'U': 3 * 9,
            'S': 3 * 10,
            'H': 3 * 11,
            'F': 3 * 12,
            'L': 3 * 13,
            'W': 3 * 14,
        };
        for (let key in powersMap) {
            if (display.match(new RegExp(key + '$'))) {
                return rawAmount * Math.pow(10, powersMap[key]);
            }
        }
        return parseFloat(display.replace(/\//, ''));
    },
    getResourceAmount: function(resource) {
        const cell = $('.res-table .resource_' + resource + ' div.resAmount');
        return this.getAmountFromDisplay(cell.text());
    },
    getResourceLimit: function(resource) {
        const cell = $('.res-table .resource_' + resource + ' div.maxRes');
        return this.getAmountFromDisplay(cell.text());
    },
    getResourcePercentFull: function(resource) {
        return this.getResourceAmount(resource) / this.getResourceLimit(resource);
    },
    getRawResourceRate: function(resource) {
        return $('.res-table').find('.resource_' + resource)
            .find('div.resPerTick').text()
    },
    getResourceRate: function(resource) {
        const rawText = this.getRawResourceRate(resource),
            number = rawText.replace(/\(|\+|\)/g, '').replace('/s', '');
        return this.getAmountFromDisplay(number);
    },
    areEldersPresent: function() {
        return $('#gameContainerId').find('.tabsContainer').find('a:contains("Trade (!)")').length === 1;
    },
    getCurrentEnergy: function() {
        return parseFloat($('#headerToolbar .energy').find('div:contains("Wt")').text().match(/[\-\.\d]+/)[0]);
    },
    updateTimeCounts: function() {
        const me = this;
        //
        me.resourceRetrievalCount = parseInt($('#gameContainerId').find('span:contains("Resource Retrieval")').text().match(/\((\d+)\)/)[1], 10);
        me.chronoFurnaceCount = parseInt($('#gameContainerId').find('span:contains("Chrono Furnace")').text().match(/\((\d+)\)/)[1], 10);

        me.secondsOfResourcesPerJump = 2 * 400 * 0.01 * me.resourceRetrievalCount;
        // this is incorrect. Currently tuned for 15 CF = 33 days
        me.secondsPerJump = 500 * 2 / me.chronoFurnaceCount;
        me.resourceRetrievalPercentIncrease = me.secondsOfResourcesPerJump / me.secondsPerJump;
        $('#resourceRetrievalNumbers').text('(CF: ' + me.chronoFurnaceCount +
                ', RR ' + me.resourceRetrievalCount + ')');
        $('#roboKittensClick-resourceRetrieval').prop('title', me.secondsOfResourcesPerJump.toFixed(1) +
                's of resources/jump' + "\n" + me.secondsPerJump.toFixed(1) + 's/jump' + "\n" +
                (me.resourceRetrievalPercentIncrease * 100).toFixed(1) + '% increase' + "\n" +
                'Click to refresh (updates automatically with ChronoFurnace change)');
    },
    updateIntervalForResourceRetrieval: function(time) {
        const me = this;
        if (!me.resourceRetrievalPercentIncrease) {
            return time;
        }
        // greater than a 50% chance of jump occurring during click interval
        if (time > me.secondsPerJump / 2) {
            time /= (1 + me.resourceRetrievalPercentIncrease);
            //time -= Math.ceil(time / me.secondsPerJump) * me.secondsOfResourcesPerJump;
        }
        return time;
    },
    isTemporalParadox: function() {
        return this.getRawResourceRate('catnip') === '???';
    },
    getCalendarSign: function() {
        return $('#calendarSign').text().trim();
    },
    /**
     * Increased unobtanium; good to coast on this
     *
     * @returns {boolean}
     */
    isRedmoon: function() {
        return this.getCalendarSign() === '⍜';
    },
    isTerminus: function() {
        return this.getCalendarSign() === '⍝';
    },
    /**
     * Gets the energy per containment chamber, attempting to not click on the
     * Space tab to check the number, since this number doesn't update frequently.
     *
     * @returns {number}
     */
    getCachedEnergyPerContainmentChamber: function() {
        const me = this;
        if (me.energyPerContainmentChamber) {
            return me.energyPerContainmentChamber;
        }
        me.clickOnTab('Space');
        return me.calculateEnergyPerContainmentChamber();
    },
    /**
     * Assumes we're on the Space tab
     *
     * @returns {number}
     */
    calculateEnergyPerContainmentChamber: function() {
        const heatsinkText = $('#gameContainerId')
                .find('span:contains("Heatsink")').text().match(/\d+/g),
            heatsinkCount = heatsinkText
                ? parseInt(heatsinkText[0], 10)
                : 0,
            // base energy
        energy = 50
            // plus heatsinks
            * (1 + 0.01 * heatsinkCount)
            // global effects
            * (1 + game.globalEffectsCached.energyConsumptionRatio);
        this.energyPerContainmentChamber = energy;
        return energy;
    },
    getElderText: function() {
        return $('#gameContainerId').find('div.title:contains("Leviathans")').parent().find('.trade-race .left').text();
    },
    clickOnTab: function(tab) {
        $('#gameContainerId').find('.tabsContainer').find('a:contains("' + tab + '")')[0].click();
    },
    /*
     * Clickers
     */
    activeClickers: {
    },
    clickFns: {
    },
    clickAndSetTimeoutFns: {
    },
    /* @var Map<string key, int milliseconds> */
    intervals: {
    },
    getResourceInterval: function(resource) {
        const interval = this.getResourceLimit(resource) / this.getResourceRate(resource);
        // happens during void space
        if (Number.isNaN(interval)) {
            return 5.0;
        }
        return interval;
    },
    fixIntervalForVoidSpace(interval) {
        if (interval === Infinity) {
            // just check back in a bit
            return 5000;
        }
        return interval;
    },
    getClickFnResource: function(resource, constraintFn, column) {
        if (!this.clickAndSetTimeoutFns[resource]) {
            this.clickFns[resource] = function() {
                if (constraintFn) {
                    if (!constraintFn()) {
                        /*
                        $('#roboKittensClick-' + resource).animate({
                                backgroundColor: "#cccccc" 
                            }, 1).animate({
                                backgroundColor: "#ffffff"
                            }, 1000);
                        */
                        return;
                    }
                    else {
                        $('.craftTable').find('.resource_' + resource).find('div:contains("all")').click();
                    }
                }
                else {
                    $('.craftTable').find('.resource_' + resource).find('div:contains("all")').click();
                }
                /*
                $('#roboKittensClick-' + resource).animate({
                        backgroundColor: "#ffff33" 
                    }, 1).animate({
                        backgroundColor: "#ffffff"
                    }, 1000);
                */
            };
            this.clickAndSetTimeoutFns[resource] = $.proxy(function() {
                $('#roboKittensClick-' + resource).prop('title',
                    'Interval time: ' + (this.intervals[resource] / 1000).toFixed(2) + 's');
                this.activeClickers[resource] = setTimeout(this.clickAndSetTimeoutFns[resource],
                    this.fixIntervalForVoidSpace(this.intervals[resource]));
                this.clickFns[resource]();
            }, this);
        }
        return this.clickAndSetTimeoutFns[resource];
    },
    getClickFnSpecial: function(action, clickFn, elementStatus, constraintFn) {
        if (!this.clickAndSetTimeoutFns[action]) {
            this.clickFns[action] = function() {
                if (constraintFn && !constraintFn()) {
                    /*
                    elementStatus.animate({
                            backgroundColor: "#cccccc" 
                        }, 1).animate({
                            backgroundColor: "#ffffff"
                        }, 1000);
                    */
                }
                else {
                    clickFn();
                    /*
                    elementStatus.animate({
                            backgroundColor: "#ffff33" 
                        }, 1).animate({
                            backgroundColor: "#ffffff"
                        }, 1000);
                    */
                }
            };
            this.clickAndSetTimeoutFns[action] = $.proxy(function() {
                $('#roboKittensClick-' + action).prop('title',
                    'Interval time: ' + (this.intervals[action] / 1000).toFixed(2) + 's');
                    //console.log(action + ': ' + (this.intervals[action] / 1000).toFixed(2) + 's');
                this.activeClickers[action] = setTimeout(this.clickAndSetTimeoutFns[action],
                    this.fixIntervalForVoidSpace(this.intervals[action]));
                this.clickFns[action]();
            }, this);
        }
        return this.clickAndSetTimeoutFns[action];
    },
    clickListeners: {
    },
    getClickListener: function(resource, interval, constraintFn, column) {
        if (!this.clickListeners[resource]) {
            this.intervals[resource] = interval;
            this.clickListeners[resource] = $.proxy(function() {
                if (this.activeClickers[resource]) {
                    clearTimeout(this.activeClickers[resource]);
                    $('#roboKittensClick-' + resource).text('-');
                    this.activeClickers[resource] = null;
                }
                else {
                    $('#roboKittensClick-' + resource).text('x');
                    this.getClickFnResource(resource, constraintFn, column)();
                }
                return false;
            }, this);
        }
        return this.clickListeners[resource];
    },
    getClickListenerSpecial: function(action, interval, clickFn, elementStatus, constraintFn) {
        if (!this.clickListeners[action]) {
            this.intervals[action] = interval;
            this.clickListeners[action] = $.proxy(function() {
                if (this.activeClickers[action]) {
                    clearTimeout(this.activeClickers[action]);
                    elementStatus.text('-');
                    this.activeClickers[action] = null;
                }
                else {
                    var fn = this.getClickFnSpecial(action, clickFn, elementStatus, constraintFn);
                    elementStatus.text('x');
                    fn();
                }
                return false;
            }, this);
        }
        return this.clickListeners[action];
    },
    initializeResource: function(resource, interval, constraintFn, column) {
        $('.craftTable').find('.resource_' + resource).
            append('<div><a id="roboKittensClick-' + resource + '" href="#">'
                + (this.activeClickers[resource] ? 'x' : '-') + '</a></div>');
        $('#roboKittensClick-' + resource).prop('title',
            'Interval time: ' + (this.intervals[resource] / 1000).toFixed(2) + 's');
        $('#roboKittensClick-' + resource).click(
                this.getClickListener(resource, interval, constraintFn, column));
    },
    initializeHunt: function() {
        $('#fastHuntContainer').find('a').after(' <a id="roboKittensClick-hunt" href="#">'
                + (this.activeClickers['hunt'] ? 'x' : '-') + '</a>');
        // see note on tradeDragons about being mutually prime
        $('#roboKittensClick-hunt').click(this.getClickListenerSpecial('hunt', 2000,
            function() {
                $('#fastHuntContainer').find('a')[0].click();
            },
            $('#roboKittensClick-hunt')));
    },
    initializePraise: function() {
        $('#fastPraiseContainer').find('a').after(' <a id="roboKittensClick-praiseTheSun" href="#">'
                + (this.activeClickers['praiseTheSun'] ? 'x' : '-') + '</a>');
        // see note on tradeDragons about being mutually prime
        $('#roboKittensClick-praiseTheSun').click(this.getClickListenerSpecial('praiseTheSun', 10000,
            function() {
                $('#fastPraiseContainer').children()[0].click();
            },
            $('#roboKittensClick-praiseTheSun')));
    },
    initializeResources: function() {
        this.initializeResource('wood', 10000);

        this.initializeResource('beam', 10000);
        this.initializeResource('slab', 10000);
        this.initializeResource('thorium', 60000);
        this.initializeResource('kerosene', 60000);

        this.initializeResource('parchment', 10000);
        this.initializeResource('manuscript', 10000);
        this.initializeResource('compendium', 15000);

        this.initializeResource('steel', 20000);
        this.initializeResource('plate', 4000, $.proxy(function() {
                return this.getResourcePercentFull('coal') < 0.5;
            }, this), 3);

        // not very often; still want to take advantage of the dragons
        // TODO update rate?
        this.initializeResource('alloy', 20000, $.proxy(function() {
                return this.getResourcePercentFull('titanium') > 0.6;
            }, this), 3);

        this.initializeResource('eludium', 8000, $.proxy(function() {
                return this.getResourcePercentFull('unobtainium') > 0.5;
            }, this), 1);
    },
    reinitialize: function() {
        if ($('.craftTable').find('a:contains("x")').length === 0
                && $('.craftTable').find('a:contains("-")').length === 0) {
            this.initializeResources();
        }
        const resourcesToShowTimeLimits = ['catnip', 'wood', 'minerals', 'coal', 'iron',
                'titanium', 'gold', 'oil', 'uranium', 'unobtainium', 'catpower',
                'science', 'culture', 'faith'];
        for (let i = 0, length = resourcesToShowTimeLimits.length; i < length; ++i) {
            const resource = resourcesToShowTimeLimits[i],
                interval = this.getResourceInterval(resource),
                rawInterval = Math.floor(interval);
            $('#resContainer').find('td:contains("' + resourcesToShowTimeLimits[i] + '")').
                prop('title', 'Time to cap: ' + interval.toFixed(2) + 's' + "\n"
                    + 'Recommended interval: ' + rawInterval + 's');
        }
        const resourcesToClickers = {
            catnip: 'wood',
            wood: 'beam',
            minerals: 'slab',
            coal: 'steel',
            //iron: 'plate',
            oil: 'kerosene',
            //uranium: 'thorium',
            manpower: 'hunt',
            culture: 'manuscript',
            faith: 'praiseTheSun'
        };
        for (let resource in resourcesToClickers) {
            if (resourcesToClickers.hasOwnProperty(resource)) {
                this.intervals[resourcesToClickers[resource]]
                    // get to 98% capacity
                    = this.updateIntervalForResourceRetrieval(
                        this.getResourceInterval(resource)) * 0.98 * 1000;
            }
        }
        this.intervals['thorium']
            // set this to half because of what we generate from trading with
            // dragons. Don't update based on that flag because this takes so
            // long to generate and it wouldn't update in time
            = this.updateIntervalForResourceRetrieval(
                this.getResourceInterval('uranium')) * 0.98 * 1000 * 0.5;

        let ironInterval;
        if (this.activeClickers['steel'])
        {
            ironInterval = this.getResourceInterval('coal') / 4;
        }
        else
        {
            ironInterval = this.getResourceInterval('iron');
        }
        this.intervals['plate'] = ironInterval * 0.98 * 1000;

        // Eludium = 1000 unobtainium
        this.intervals['eludium'] = this.updateIntervalForResourceRetrieval(
                1000 / this.getResourceRate('unobtainium')) * 0.98 * 1000;
        // 5k per trade; only want to use X% on this
        // Usually 0.5 (50%) for main run; increase when Eludium is high
        const unobtaniumRate = this.getResourceRate('unobtainium');
        let interval;
        if (!unobtaniumRate) {
            interval = 5000; // try back in 5s
        }
        else {
            interval = this.updateIntervalForResourceRetrieval(
                this.UNOBTAINIUM_PER_LEVIATHAN_TRADE
                / this.getResourceRate('unobtainium'))
                / 0.8 * 0.98 * 1000;
        }
        this.intervals['leviathans'] = interval;
    },
    initialize: function() {
        const me = this;
        setInterval($.proxy(this.reinitialize, this), 1000);
        this.reinitialize();
        this.initializeHunt();
        this.initializePraise();

        $('#fastPraiseContainer').after('<div id="roboKittens" style="padding-top: 10px; padding-left: 5px;">' +
            '<a id="roboKittensClick-observe" href="#">Observe the sky <span id="observeStatus">' +
                (this.activeClickers['observe'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-leviathans" href="#">Trade with Leviathans <span id="leviathansStatus">' +
                (this.activeClickers['leviathans'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-leviathansFull" href="#">- Full <span id="leviathansFullStatus">' +
                (this.activeClickers['leviathansFull'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-feedElders" href="#">Feed elders <span id="feedEldersStatus">' +
                (this.activeClickers['feedElders'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-tradeDragons" href="#">Raise spice (dragons) <span id="tradeDragonsStatus">' +
                (this.activeClickers['tradeDragons'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-promote" href="#">Promote kittens <span id="promoteStatus">' +
                (this.activeClickers['promote'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-chronoFurnace" href="#">Chrono furnace <span id="chronoFurnaceStatus">' +
                (this.activeClickers['chronoFurnace'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-contChamber" href="#">Cont. chamber power <span id="contChamberNumbers"></span> <span id="contChamberStatus">' +
                (this.activeClickers['contChamber'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-resourceRetrieval" href="#">Resource retrieval <span id="resourceRetrievalNumbers"></span></a><br>' +
            '<a id="roboKittensClick-combust" href="#">Combust and such <span id="combustNumbers"></span> <span id="combustStatus">' +
                (this.activeClickers['combust'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-combust5x" href="#">- 5x <span id="combust5xStatus">' +
                (this.activeClickers['combust5x'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-combust45x" href="#">- 45x <span id="combust45xStatus">' +
                (this.activeClickers['combust45x'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-combustStopUnobtainium" href="#">- Stop for unobtainium <span id="combustStopUnobtainiumStatus">' +
                (this.activeClickers['combustStopUnobtainium'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-combustOne" href="#">Combust one</a><br>' +
            '<a id="roboKittensClick-gatherVoids" href="#">Gather voids <span id="gatherVoidsStatus">' +
                (this.gatherVoids ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-gatherVoidsAutoToggle" href="#">- Auto-toggle near AM cap <span id="gatherVoidsAutoToggleStatus">' +
                (this.gatherVoidsAutoToggle ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-resourceCount" href="#">Resource count <span id="resourceCountStatus">' +
                (this.activeClickers['resourceCount'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-speculate" href="#">Speculate <span id="speculateStatus">' +
                (this.activeClickers['speculate'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-build" href="#">Build <span id="buildStatus">' +
                (this.activeClickers['build'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-buildSpace" href="#">Build space <span id="buildSpaceStatus">' +
                (this.activeClickers['buildSpace'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-buildMini" href="#">Build mini <span id="buildMiniStatus">' +
                (this.activeClickers['buildMini'] ? 'x' : '-') + '</span></a><br>' +
            '<a id="roboKittensClick-fixCryo" href="#">Fix cryo <span id="fixCryoStatus">' +
                (this.activeClickers['fixCryo'] ? 'x' : '-') + '</span></a><br>' +
            '</div>');

        $('#roboKittensClick-observe').click(this.getClickListenerSpecial('observe', 2 * 1000,
            function() {
                $('#observeButton #observeBtn').click();
            }, $('#observeStatus')));

        $('#roboKittensClick-leviathans').click(this.getClickListenerSpecial('leviathans', 120 * 1000,
                function() {
                    // no trading now
                    if (me.isTemporalParadox() || !me.areEldersPresent()) {
                        return;
                    }
                    $('#gameContainerId').find('.tabsContainer').find('a:contains("Trade (!)")')[0].click();
                    $('#gameContainerId').find('div.title:contains("Leviathans")').next().find('span:contains("Send caravan")')[0].click();
                },
                $('#leviathansStatus'),
                $.proxy(function() {
                    return this.getResourceAmount('unobtainium')
                            > this.UNOBTAINIUM_PER_LEVIATHAN_TRADE
                        && this.areEldersPresent();
                }, this)));
        $('#roboKittensClick-' + 'leviathans').prop('title',
            'Interval time: ' + (this.intervals['leviathans'] / 1000).toFixed(2) + 's');

        // turn eludium crafting off when using this
        $('#roboKittensClick-leviathansFull').click(this.getClickListenerSpecial('leviathansFull', 15 * 1000,
            function() {
                // no trading now
                if (me.isTemporalParadox() || !me.areEldersPresent()) {
                    return;
                }
                $('#gameContainerId').find('.tabsContainer').find('a:contains("Trade (!)")')[0].click();
                $('#gameContainerId').find('div.title:contains("Leviathans")').next().find('a:contains("all")')[0].click();
            },
            $('#leviathansFullStatus'),
            $.proxy(function() {
                return this.getResourcePercentFull('unobtainium') > 0.5
                    && this.getResourceAmount('unobtainium')
                        > this.UNOBTAINIUM_PER_LEVIATHAN_TRADE
                    && this.areEldersPresent();
            }, this)));
        $('#roboKittensClick-feedElders').click(this.getClickListenerSpecial('feedElders', 2 * 1000,
                $.proxy(function() {
                    this.clickOnTab('Trade');
                    const energyData = this.getElderText().match(/Energy: (\d+) \/ (\d+)/);
                    if (energyData !== null && energyData[1] === energyData[2]) {
                        console.log('Leviathans full; exiting');
                        return;
                    }
                    $('#gameContainerId').find('span:contains("Feed elders")').click();
                }, this),
                $('#feedEldersStatus'),
                $.proxy(function() {
                    return this.getResourceAmount('necrocorn') >= 1
                        && this.areEldersPresent();
                }, this)));
        /*
         * Make sure that this interval and that of hunt are mutually prime 
         * (or fairly mutually prime; e.g. a small lowest common divisor) so
         * that they don't fight with each other.
         */
        $('#roboKittensClick-tradeDragons').click(this.getClickListenerSpecial('tradeDragons', 30000,
                function() {
                    $('#gameContainerId').find('.tabsContainer').find('a:contains("Trade")')[0].click();
                    $('#gameContainerId').find('div.title:contains("Dragons")').next().find('a:contains("all")')[0].click();
                },
                $('#tradeDragonsStatus'),
                $.proxy(function() {
                    return this.getResourcePercentFull('titanium') > 0.8;
                }, this)));
        $('#roboKittensClick-' + 'tradeDragons').prop('title',
            'Interval time: ' + (this.intervals['tradeDragons'] / 1000).toFixed(2) + 's');

        $('#roboKittensClick-promote').click(this.getClickListenerSpecial('promote', 10 * 60 * 1000,
                function() {
                    $('#gameContainerId').find('.tabsContainer').find('a:contains("Bonfire")').next().next()[0].click();
                    $('#gameContainerId').find('span:contains("Promote kittens")')[0].click();
                },
                $('#promoteStatus')));
        $('#roboKittensClick-' + 'promote').prop('title',
            'Interval time: ' + (this.intervals['promote'] / 1000).toFixed(2) + 's');

        $('#roboKittensClick-speculate').click(this.getClickListenerSpecial('speculate', 20 * 60 * 1000,
            $.proxy(function() {
                this.clickOnTab('Trade');
                const bcoinPrice = parseFloat(this.getElderText().match(/B-coin price: ([\d\.]+)R/)[1]),
                relicCount = me.getResourceAmount('relic'),
                bcoinCount = me.getResourceAmount('blackcoin');
                // the idea behind these thresholds is that it should take at least the time of the delay (20 minutes)
                // to go between prices. It seems like it moves maybe 2-3/hour on average?
                // keeep buying until the bitter end; it'll keep going up
                if (bcoinPrice < 1100 - 15 && relicCount > 1000000) {
                    // buy bcoin
                    $('#gameContainerId').find('div.crypto-trade').find('span.btnTitle:contains("Buy bcoin")').click();
                }
                else if (bcoinPrice > 1100 - 5 && bcoinCount > 100) {
                    // sell
                    $('#gameContainerId').find('div.crypto-trade').find('span.btnTitle:contains("Sell bcoin")').click();
                }
            }, this),
            $('#speculateStatus')));

        $('#roboKittensClick-build').click(this.getClickListenerSpecial('build', 4 * 1000,
            $.proxy(function() {
                this.clickOnTab('Bonfire');
                // order matters
                // buildings to cap
                const buildings = [
                    'Workshop',
                    'Hut',
                    'Log House',
                    'Academy',

                    'Temple',
                    'Tradepost',
                    'Mint',

                    'Brewery',
                    'Chapel',

                    'Accelerator',
                    'Factory',
                    'Reactor',

                    'Observatory',
                    'Broadcast Tower',

                    'Hydro Plant',
                    'Solar Farm',
                    'Mansion',

                    'Lumber Mill',
// TODO apocalypse
                    //'Mine',
                    //'Smelter',
                    'Barn',
                ];
                buildings.forEach(function(building) {
                    let btn = $('.tabInner.Bonfire .bldGroupContainer span.btnTitle:contains("' + building + '")').filter(function() { return $(this).text().indexOf(building +' (') === 0; });
                    if (btn.parent().parent().hasClass('disabled')) {
                        return;
                    }
                    btn.click();
                });
            }, this),
            $('#buildStatus')));

        $('#roboKittensClick-buildSpace').click(this.getClickListenerSpecial('buildSpace', 4 * 1000,
            $.proxy(function() {
                this.clickOnTab('Space');
                // order matters
                // buildings to cap
                const buildings = [
                    'Lunar Outpost',
                    'Moon Base',

                    'Molten Core',

                    'Space Elevator',
                    'Satellite',
                    'Space St.',

                    'Planet Cracker',

                    'Research Vessel',
                ];
                buildings.forEach(function(building) {
                    let btn = $('.tabInner.Space span.btnTitle:contains("' + building + '")');
                    if (btn.parent().parent().hasClass('disabled')) {
                        return;
                    }
                    btn.click();
                });
            }, this),
            $('#buildSpaceStatus')));

        $('#roboKittensClick-buildMini').click(this.getClickListenerSpecial('buildMini', 4 * 1000,
            $.proxy(function() {
                // only do this when it's selected
                if (!$('.tab.Bonfire').hasClass('activeTab')) {
                    return;
                }
                // order matters
                // buildings to cap
                const buildings = [
                    'Hut',
                    'Log House',
                    //'Mansion',
                ];
                buildings.forEach(function(building) {
                    let btn = $('.tabInner.Bonfire .bldGroupContainer span.btnTitle:contains("' + building + '")');
                    if (btn.parent().parent().hasClass('disabled')) {
                        return;
                    }
                    btn.click();
                });
            }, this),
            $('#buildMiniStatus')));

        $('#roboKittensClick-fixCryo').click(this.getClickListenerSpecial('fixCryo', 4 * 1000,
            $.proxy(function() {
                // only do this when it's selected
                if (!$('.tab.Time').hasClass('activeTab')) {
                    return;
                }
                const buildings = [
                    'Fix Cryochamber',
                ];
                buildings.forEach(function(building) {
                    let btn = $('.tabInner.Time span.btnTitle:contains("' + building + '")');
                    if (btn.parent().parent().hasClass('disabled')) {
                        return;
                    }
                    btn.click();
                });
            }, this),
            $('#fixCryoStatus')));

        this.isChronoFurnaceOn = false;
        $('#roboKittensClick-chronoFurnace').click(this.getClickListenerSpecial('chronoFurnace', 30 * 1000,
                $.proxy(function() {
                    if (this.isRedmoon() && this.isChronoFurnaceOn) {
                        me.clickOnTab('Time');
                        this.isChronoFurnaceOn = $('span:contains("Chrono Furnace")').next().text() === 'A';
                        if (!this.isChronoFurnaceOn) {
                            return;
                        }
                        $('span:contains("Chrono Furnace")').next()[0].click();
                        this.isChronoFurnaceOn = !this.isChronoFurnaceOn;
                        var stasit = $('#gameContainerId').find('span:contains("Tempus Stasit")');
                        if (stasit && stasit[0]) {
                            stasit[0].click();
                        }
                        this.updateTimeCounts();
                    }
                    else if (!this.isRedmoon() && !this.isChronoFurnaceOn) {
                        me.clickOnTab('Time');
                        this.isChronoFurnaceOn = $('span:contains("Chrono Furnace")').next().text() === 'A';
                        if (this.isChronoFurnaceOn) {
                            return;
                        }
                        $('span:contains("Chrono Furnace")').next()[0].click();
                        this.isChronoFurnaceOn = !this.isChronoFurnaceOn;
                        this.updateTimeCounts();
                    }
                }, this),
                $('#chronoFurnaceStatus')));
        $('#roboKittensClick-' + 'chronoFurnace').prop('title',
            'Interval time: ' + (this.intervals['chronoFurnace'] / 1000).toFixed(2) + 's');

        me.contChamberCount = 0;
        me.contChambersOn = 1;
        $('#roboKittensClick-contChamber').click(me.getClickListenerSpecial('contChamber', 20 * 1000,
                function() {
            me.contChamberPower = !me.contChamberPower;
                    // positive power, want to turn on
                    const getChambersToChange = function(contChambersToChange) {
                        if (contChambersToChange > 0) {
                            // all on, so skip
                            if (me.contChambersOn === me.contChamberCount) {
                                return 0;
                            }
                            if (contChambersToChange > me.contChamberCount - me.contChambersOn) {
                                contChambersToChange = me.contChamberCount - me.contChambersOn;
                            }
                        }
                        // negative power, need to turn off
                        else if (contChambersToChange < 0) {
                            if (me.contChambersOn === 0) {
                                return 0;
                            }
                            if (contChambersToChange < -1 * me.contChambersOn) {
                                contChambersToChange = -1 * me.contChambersOn;
                            }
                        }
                        return contChambersToChange;
                    };
                    var contChambersToChange = Math.floor(me.getCurrentEnergy() / me.getCachedEnergyPerContainmentChamber());
                    contChambersToChange = getChambersToChange(contChambersToChange);
                    if (contChambersToChange === 0) {
                        return;
                    }
                    // looks like we should change it, so click on Space and
                    // try again
                    me.clickOnTab('Space');
                    var contChamberInfo = $('#gameContainerId').find('span:contains("Cont. Chamber")').text().match(/(\d+)\/(\d+)/);
                    // update info
                    me.contChambersOn = contChamberInfo[1];
                    me.contChamberCount = contChamberInfo[2];
                    var energyPerChamber = me.calculateEnergyPerContainmentChamber(),
                        contChambersToChange = Math.floor(me.getCurrentEnergy() / energyPerChamber);
                    contChambersToChange = getChambersToChange(contChambersToChange);
                    if (contChambersToChange === 0) {
                        return;
                    }
                    if (contChambersToChange > 0) {
                        var plus = $('#gameContainerId').find('span:contains("Cont. Chamber")').next().next().find('a:contains("+")')[2];
                        for (var i = 0; i < contChambersToChange; ++i) {
                            plus.click();
                            ++me.contChambersOn;
                        }
                    }
                    else {
                        var minus = $('#gameContainerId').find('span:contains("Cont. Chamber")').next().find('a:contains("-")')[2];
                        for (var i = 0; i > contChambersToChange; --i) {
                            minus.click();
                            --me.contChambersOn;
                        }
                    }
                    $('#contChamberNumbers').text('(' + me.contChambersOn + '/' + me.contChamberCount + ')');
                },
                $('#contChamberStatus')));
        $('#roboKittensClick-' + 'contChamber').prop('title',
            'Interval time: ' + (this.intervals['contChamber'] / 1000).toFixed(2) + 's');

        $('#roboKittensClick-resourceRetrieval').click(function() {
            $('#gameContainerId').find('.tabsContainer').find('a:contains("Time")')[0].click();
            me.updateTimeCounts();
            return false;
        });

        // delay not less than 2s or relics won't produce
        $('#roboKittensClick-combust').click(this.getClickListenerSpecial('combust', 4 * 1000,
            function() {
                me.combustTc();
                return false;
            },
            $('#combustStatus'),
            function() {
                return me.getResourceAmount('unobtainium')
                    > me.UNOBTAINIUM_PER_LEVIATHAN_TRADE;
            }));
        $('#roboKittensClick-combustOne').click($.proxy(this.combustTc, this, true));

        $('#roboKittensClick-combust5x').click(function() {
            me.combust5x = !me.combust5x;
            $('#combust5xStatus').text(me.combust5x ? 'x' : '-');
        });
        $('#roboKittensClick-combust45x').click(function() {
            me.combust45x = !me.combust45x;
            $('#combust45xStatus').text(me.combust45x ? 'x' : '-');
        });

        $('#roboKittensClick-combustStopUnobtainium').click(
            this.getClickListenerSpecial('combustStopUnobtainium', 10 * 1000,
                function() {
                    if (me.getResourcePercentFull('unobtainium') > 0.97) {
                        if (me.activeClickers['combust']) {
                            $('#roboKittensClick-combust').click();
                        }
                    }
                },
                $('#combustStopUnobtainiumStatus')
            ));

        $('#roboKittensClick-gatherVoids').click(function() {
            me.gatherVoids = !me.gatherVoids;
            $('#gatherVoidsStatus').text(me.gatherVoids ? 'x' : '-');
        });

        $('#roboKittensClick-gatherVoidsAutoToggle').click(
            this.getClickListenerSpecial('gatherVoidsAutoToggle', 60 * 1000,
                function() {
                    // Power check: to make sure we aren't immediately after
                    // Terminus, but before the cont chamber power adjusts
                    if (!me.isTerminus() && me.getResourcePercentFull('antimatter') > 0.8
                        && me.getCurrentEnergy() < 100) {
                        if (!me.gatherVoids) {
                            $('#roboKittensClick-gatherVoids').click();
                        }
                    }
                },
                $('#gatherVoidsAutoToggleStatus')
            ));

        $('#roboKittensClick-resourceCount').click(
            this.getClickListenerSpecial('resourceCount', 30 * 1000,
            function() {
                //$('.res-row.resource_relic .resPerTick').html('+' + game.globalEffectsCached.relicPerDay.toFixed(2) + '/d');
                //$('.res-row.resource_necrocorn .resPerTick').html('+' + (game.globalEffectsCached.corruptionRatio * 1000).toFixed(4) + 'r (e-3)');
                me.corruptionInitial = game.religion.corruption;
                me.corruptionStartTime = Date.now();
                me.corruptionInitialTick = game.ticks;
                const checkCorruptionFn = function() {
                    if (game.religion.corruption > me.corruptionInitial) {
                        const diff = game.religion.corruption - me.corruptionInitial;
                        const tickDiff = game.ticks - me.corruptionInitialTick;
                        const corruptionPerTick = diff / tickDiff;
                        //console.log(game.religion.corruption, me.corruptionInitial, game.ticks, me.corruptionInitialTick, corruptionPerTick);
                        const corruptionPerS = corruptionPerTick * 5;
                        $('.res-row.resource_necrocorn .resPerTick').html(
                            '<span title="' + (1 / corruptionPerS).toFixed(1) + 's/necrocorn">+' + (corruptionPerS * 1000).toFixed(3) + 'e-3/s</span>'
                        );
                        return false;
                    }
                    if (Date.now() > me.corruptionStartTime + 10 * 1000) {
                        $('.res-row.resource_necrocorn .resPerTick').html('?');
                        return false;
                    }
                    return true;
                };
                setTimeout(function() {
                    if (checkCorruptionFn()) {
                        setTimeout(checkCorruptionFn, 2000);
                    }
                }, 2000);
            }, $('#resourceCountStatus'),
            function() {
                return !me.isTemporalParadox();
            })
        );

        // always display full pollution information
        game.detailedPollutionInfo = true;
    },
    combustTc: function(forceRedmoon) {
        var me = this;
        if (me.isTemporalParadox()) {
            console.log('No combusting during paradox; exit');
            return;
        }
        if (me.gatherVoids && !forceRedmoon && me.isRedmoon()) {
            console.log('gathering voids; exit');
            return;
        }
        if (me.activeClickers['praiseTheSun']) {
            $('#fastPraiseContainer').children()[0].click();
        }
        if (me.activeClickers['manuscript']) {
            me.clickFns['manuscript']();
        }

        if ($('#gameContainerId').find('.tabsContainer').find('a:contains("Time")')[0].className.match(/activeTab/) === null) {
            me.clickOnTab('Time');
        }
        const heatInfo = $('#gameContainerId').find('span:contains("Heat:")').text().match(/Heat: ([0-9\.A-Z]+) \/ ([0-9\.A-Z]+)/),
            heat = me.getAmountFromDisplay(heatInfo[1]),
            heatCapacity = me.getAmountFromDisplay(heatInfo[2]);
        $('#combustNumbers').text('(' + heat + '/' + heatCapacity + ')');
        console.log(heat);
        console.log(heatCapacity);
        // if it's getting hot, just coast here
        if (!me.gatherVoids && !forceRedmoon && heat > heatCapacity * 0.9 && $('#calendarSign').text().trim() === '⍜') {
            console.log('kinda hot, exit');
            return;
        }
        else if (heat > heatCapacity - 10) {
            console.log('too hot, exit!');
            return;
        }
        var fugit = $('#gameContainerId').find('span:contains("Tempus Fugit")').parent().find('a:contains("off")');
        if (fugit && fugit[0]) {
            // TODO make switch
            //fugit[0].click();
        }
        const currentEnergy = me.getCurrentEnergy(),
        cycleYear = game.calendar.cycleYear,
            // it's nice to keep it at 0, but with more CF it misses more frequently
        canDoBigShatter = currentEnergy > 0 && (cycleYear === 0 || cycleYear === 1);
        if (me.combust45x
            && (me.contChamberPower && me.isTerminus()
                || !me.contChamberPower)
            && canDoBigShatter) {
            $('#gameContainerId').find('span:contains("Combust TC")').parent().find('a:contains("x45")')[0].click();
        }
        else if (me.combust5x && canDoBigShatter) {
            $('#gameContainerId').find('span:contains("Combust TC")').parent().find('a[class!=rightestLink]:contains("x5")')[0].click();
        }
        else {
            $('#gameContainerId').find('span:contains("Combust TC")')[0].click();
        }

        if (false && me.getResourceAmount('unobtainium') > me.UNOBTAINIUM_PER_LEVIATHAN_TRADE
                && me.areEldersPresent()) {
            $('#gameContainerId').find('.tabsContainer').find('a:contains("Trade (!)")')[0].click();
            $('#gameContainerId').find('div.title:contains("Leviathans")').next().find('span:contains("Send caravan")')[0].click();
        }

        setTimeout(function() {
            if (me.activeClickers['praiseTheSun']) {
                $('#fastPraiseContainer').children()[0].click();
            }

            if (me.activeClickers['hunt']) {
                $('#fastHuntContainer').find('a')[0].click();
            }
            if (me.clickFns['beam'] && me.activeClickers['beam']) {
                me.clickFns['beam']();
            }
            if (me.clickFns['slab'] && me.activeClickers['slap']) {
                me.clickFns['slab']();
            }
            if (me.activeClickers['steel']) {
                me.clickFns['steel']();
            }
            if (me.activeClickers['plate']) {
                $('.craftTable .resource_plate').find('div:contains("all")')[0].click();
            }
            if (me.activeClickers['thorium']) {
                me.clickFns['thorium']();
            }
            if (me.activeClickers['kerosene']) {
                me.clickFns['kerosene']();
            }

            if (me.getResourceAmount('unobtainium') > 150 * 1000) {
                //$('#craftContainer').find('td:contains("' + 'eludium' + ':")').parent().find(':nth-child(' + (2 + 3) + ')').find('a')[0].click();
            }

            if (me.activeClickers['parchment']) {
                me.clickFns['parchment']();
            }
            if (me.activeClickers['manuscript']) {
                me.clickFns['manuscript']();
            }
            if (me.activeClickers['compendium']) {
                me.clickFns['compendium']();
            }
        }, 300);

        if (this.activeClickers['contChamber']) {
            // wait until the power can update
            setTimeout(me.clickFns['contChamber'], 800);
        }
    }
};

RoboKittens.initialize();
