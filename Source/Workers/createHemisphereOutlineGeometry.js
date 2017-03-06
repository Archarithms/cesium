/**
 * Created by Brent on 4/7/2015.
 */
/*global define*/
define([
    '../Core/defined',
    '../Core/HemisphereOutlineGeometry'
], function(
    defined,
    HemisphereOutlineGeometry) {
    "use strict";

    return function(hemisphereOutlineGeometry, offset) {
        if (defined(offset)) {
            hemisphereOutlineGeometry = HemisphereOutlineGeometry.unpack(hemisphereOutlineGeometry, offset);
        }
        return HemisphereOutlineGeometry.createGeometry(hemisphereOutlineGeometry);
    };
});
