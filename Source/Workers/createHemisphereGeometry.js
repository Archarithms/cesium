/*global define*/
define([
        '../Core/defined',
        '../Core/HemisphereGeometry'
    ], function(
        defined,
        HemisphereGeometry) {
    "use strict";

    return function(hemisphereGeometry, offset) {
        if (defined(offset)) {
            hemisphereGeometry = HemisphereGeometry.unpack(hemisphereGeometry, offset);
        }
        return HemisphereGeometry.createGeometry(hemisphereGeometry);
    };
});
