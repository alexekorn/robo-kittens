RoboKittensMini = {
    clickOnTab: function(tab) {
        $('#gameContainerId').find('.tabsContainer').find('a:contains("' + tab + '")')[0].click();
    },
};

RoboKittensMini.clickOnTab('Bonfire');
RoboKittensMini.buildings = ['Workshop'];
                RoboKittensMini.buildings.forEach(function(building) {
                    let btn = $('.tabInner.Bonfire .bldGroupContainer span.btnTitle:contains("' + building + '")');
                    if (btn.parent().parent().hasClass('disabled')) {
                        return;
                    }
                    btn.click();
                });

RoboKittensMini.clickOnTab('Science');
RoboKittensMini.technologies = [
    'Calendar',
    'Agriculture',
    'Archery',
    'Mining',
    'Metal Working',
    'Animal Husbandry',
    'Civil Service',
    'Mathematics',
    'Construction',
    'Engineering',
    'Currency',
    'Writing',
    'Philosophy',
    'Machinery',
    'Steel',
    'Theology',
    'Astronomy',
    'Navigation',
    'Architecture',
    'Physics',
    'Geology',
    'Chemistry',
    'Acoustics',
    'Electricity',
    'Biology',
    'Drama and Poetry',
    'Industrialization',
    'Mechanization',
    'Metallurgy',
    'Combustion',
    'Electronics',
    'Nuclear Fission',
    'Rocketry',
    'Satellites',
    'Orbital Engineering',
    'Exogeology',
    'Advanced Exogeology',
    'Particle Physics',
    'Dimensional Physics',
    // new
    'Tachyon Theory',
    'Void Space',
    'Paradox Theory',
    'Ecology', // more power!
    'Robotics', // more power!

    // unlocks Cold Fusion
    'Nanotechnology',
    'Superconductors',
];

RoboKittensMini.technologies.forEach(function(technology) {
    $('.tabInner.Science > table.table span.btnTitle:contains("' + technology + '")').click();
});

RoboKittensMini.clickOnTab('Workshop');
RoboKittensMini.workshops = [
    'Mineral Axe',
    'Iron Axe',
    'Steel Axe',
    'Reinforced Saw',
    'Steel Saw',
    'Titanium Axe',
    'Alloy Axe',

    'Expanded Barns',
    'Reinforced Barns',
    'Reinforced Warehouses',
    'Alloy Barns',
    'Alloy Warehouses',
    'Storage Bunkers',
    'Energy Rifts',
    'Stasis Chambers',
    'Flux Condensator',
    'Expanded Cargo',
    'Reactor Vessel',

    'Unobtainium Huts',
    'Eludium Huts',

    'Composite Bow',
    'Crossbow',
    'Railgun',
    'Bolas',
    'Hunting Armour',
    'Steel Armour',
    'Alloy Armour',
    'Concrete Pillars',
    'Silos',
    'Titanium Saw',
    'Titanium Barns',
    'Alloy Saw',
    'Concrete Barns',
    'Titanium Warehouses',
    'Concrete Warehouses',
    'Void Energy',
    'Dark Energy',
    'Ironwood Huts',
    'Concrete Huts',

    'Chronoforge',
    'Cold Fusion',
];

RoboKittensMini.workshops.forEach(function(workshop) {
    $('.tabInner.Workshop span.btnTitle:contains("' + workshop + '")').click();
});


RoboKittensMini.clickOnTab('Time');
$('.tabInner.Time span.btnTitle:contains("Chronocontrol")').click();

RoboKittensMini.clickOnTab('Workshop');
RoboKittensMini.workshops2 = ['Chronosurge'];

RoboKittensMini.workshops2.forEach(function(workshop) {
    $('.tabInner.Workshop span.btnTitle:contains("' + workshop + '")').click();
});

