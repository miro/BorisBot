'use strict';
var expect              = require('chai').expect;

var ctrl          = require('../src/controllers/linkController');

describe('linkController findLink', () => {
    it('finds basic links', () => {
        expect(ctrl.findLink('spinni.org juuh näin on')).to.equal('spinni.org');
        expect(ctrl.findLink('juuh näin on spinni.org')).to.equal('spinni.org');
    });

    it('drops www- and protocol-prefix', () => {
        expect(ctrl.findLink('juuh näin on http://spinni.org aina')).to.equal('spinni.org');
        expect(ctrl.findLink('juuh näin on www.spinni.org aina')).to.equal('spinni.org');
    });

    it('handles more complicated links', () => {
        expect(ctrl.findLink('viesti spinni.org/link/indeep/somewhere?parametri=on#anchor'))
            .to.equal('spinni.org/link/indeep/somewhere?parametri=on#anchor');
    });

    it('returns null for messages without links', () => {
        expect(ctrl.findLink('no link on this message jeah')).to.equal(null);
    });
});

