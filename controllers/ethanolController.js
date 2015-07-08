var db      = require('./database')

var ethanol = {};

ethanol.burnRate = function(weight) {
    var liverBurnRate = 0.1; // 1 gram of ethanol per 10 kg bodymass in one hour
    var otherOrgansBurnRate = (liverBurnRate / 0.94) * 0.06 // 94% from liver, 6% from other organs   
    return (liverBurnRate + otherOrgansBurnRate) * weight // grams per hour
}

ethanol.perMil = function(ethGrams, weight, male) {
    var waterConsentration = 0.75;
    if (!male) { waterConsentration=0.66 };
    if (ethGrams < 0) { return 0 }
    else { return ethGrams / (waterConsentration*weight) };
};

ethanol.drunklevelNow = function(ethGrams, hours, weight, male) {
    var burnedEthGrams = ethanol.burnRate(weight) * hours;
    return ethanol.perMil(ethGrams-burnedEthGrams, weight, male).toFixed(2);
}

ethanol.whenUserWasLastSober = function(userId) {
    //Work in progress
}

module.exports = ethanol;