/**
 * Created by Brent on 4/7/2015.
 */
/*global define*/
define([
    './BoundingSphere',
    './Cartesian2',
    './Cartesian3',
    './ComponentDatatype',
    './defaultValue',
    './defined',
    './DeveloperError',
    './Geometry',
    './GeometryAttribute',
    './GeometryAttributes',
    './IndexDatatype',
    './Math',
    './PrimitiveType'
], function(
    BoundingSphere,
    Cartesian2,
    Cartesian3,
    ComponentDatatype,
    defaultValue,
    defined,
    DeveloperError,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    IndexDatatype,
    CesiumMath,
    PrimitiveType) {
    "use strict";


    var HemisphereOutlineGeometry = function(options) {

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radius = defaultValue(options.radius, 10000);
        var minRange = defaultValue(options.minRange, 300);
        var stackPartitions = defaultValue(options.stackPartitions, 10);
        var slicePartitions = defaultValue(options.slicePartitions, 10);
        var angleAz = defaultValue(options.angleAz, 90);
        var minEl = defaultValue(options.minEl, 3);
        var maxEl = defaultValue(options.maxEl, 85);

        //>>includeStart('debug', pragmas.debug);
        if (slicePartitions < 3) {
            throw new DeveloperError ('options.slicePartitions cannot be less than three.');
        }
        if (stackPartitions < 3) {
            throw new DeveloperError('options.stackPartitions cannot be less than three.');
        }
        if (!defined(radius) || radius < 0) {
            throw new DeveloperError('options.radius cannot be less than zero.');
        }
        //>>includeEnd('debug');

        this._radius = radius;
        this._minRange = minRange;
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._angleAz = angleAz;
        this._minEl = minEl;
        this._maxEl = maxEl;
        this._workerName = 'createHemisphereOutlineGeometry';
    };

    HemisphereOutlineGeometry.packedLength = 7;

    HemisphereOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value._radius;
        array[startingIndex++] = value._minRange;
        array[startingIndex++] = value._stackPartitions;
        array[startingIndex++] = value._slicePartitions;
        array[startingIndex++] = value._angleAz;
        array[startingIndex++] = value._minEl;
        array[startingIndex]   = value._maxEl;
    };

    var scratchOptions = {
        radius : undefined,
        minRange : undefined,
        stackPartitions : undefined,
        slicePartitions : undefined,
        angleAz : undefined,
        minEl : undefined,
        maxEl : undefined
    };
    HemisphereOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var radius = array[startingIndex++];
        var minRange = array[startingIndex++];
        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex++];
        var angleAz = array[startingIndex++];
        var minEl = array[startingIndex++];
        var maxEl = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.radius = radius;
            scratchOptions.minRange = minRange;
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            scratchOptions.angleAz = angleAz;
            scratchOptions.minEl = minEl;
            scratchOptions.maxEl = maxEl;
            return new HemisphereOutlineGeometry(scratchOptions);
        }

        result._radius = radius;
        result._minRange = minRange;
        result._stackPartitions = stackPartitions;
        result._slicePartitions = slicePartitions;
        result._angleAz = angleAz;
        result._minEl = minEl;
        result._maxEl = maxEl;

        return result;
    };
    HemisphereOutlineGeometry.createGeometry = function(hemisphereOutlineGeometry) {
        var radius = hemisphereOutlineGeometry._radius;
        var minRange = hemisphereOutlineGeometry._minRange;
        var angleAz = hemisphereOutlineGeometry._angleAz;
        var minEl = hemisphereOutlineGeometry._minEl;
        var maxEl = hemisphereOutlineGeometry._maxEl;
        var slicePartitions = hemisphereOutlineGeometry._slicePartitions;
        var stackPartitions = hemisphereOutlineGeometry._stackPartitions;

        var vertexCount = ((stackPartitions + 1) * (slicePartitions + 1)) + ((stackPartitions + 1) * (slicePartitions + 1));
        var positions = new Float64Array(vertexCount * 3);

        var angleEl = maxEl - minEl;
        var aDiv = (angleEl / stackPartitions);
        var stEl = (90 - maxEl) / aDiv;
        var stStop = stEl + stackPartitions;

        //vertices and normals
        var index = 0;
        for (var lat=stEl; lat <= stStop; lat+=1) {
            var theta = (Math.PI * lat) / (180/aDiv);
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var lon=0; lon <= slicePartitions; lon+=1) {
                var phi = (CesiumMath.TWO_PI * lon) / (slicePartitions * (360/angleAz));
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = sinPhi * sinTheta;
                var y = cosPhi * sinTheta;
                var z = cosTheta;

                positions[index++] = (minRange * x);
                positions[index++] = (minRange * y);
                positions[index++] = (minRange * z);
                positions[index++] = (radius * x);
                positions[index++] = (radius * y);
                positions[index++] = (radius * z);
            }
        }
        var attributes = new GeometryAttributes();

        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });

        //indices
        var numIndices = ((slicePartitions * stackPartitions * 2) * 8) + ((slicePartitions + stackPartitions) * 4);
        var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);

        var indexI = 0;
        var inc = 0;
        for (var latNum = 0; latNum < (stackPartitions); latNum++) {
            for (var lonNum = 1; lonNum <= (slicePartitions); lonNum++) {

                var first = inc;
                var second = first + ((slicePartitions + 1) * 2);

                if (latNum == 0){
                    indices[indexI++] = (first);
                    indices[indexI++] = (first + 1);
                }
                if (lonNum == 1){
                    indices[indexI++] = (second);
                    indices[indexI++] = (second + 1);
                }

                indices[indexI++] = (first + 2);
                indices[indexI++] = (first);
                indices[indexI++] = (first);
                indices[indexI++] = (second);

                indices[indexI++] = (second);
                indices[indexI++] = (second + 2);
                indices[indexI++] = (second + 2);
                indices[indexI++] = (first + 2);

                indices[indexI++] = (first + 3);
                indices[indexI++] = (first + 1);
                indices[indexI++] = (first + 1);
                indices[indexI++] = (second + 1);

                indices[indexI++] = (second + 1);
                indices[indexI++] = (second + 3);
                indices[indexI++] = (second + 3);
                indices[indexI++] = (first + 3);

                if (lonNum == slicePartitions) {
                    indices[indexI++] = (first + 3);
                    indices[indexI++] = (first + 2);
                }
                if (latNum == (stackPartitions - 1)) {
                    indices[indexI++] = (second + 3);
                    indices[indexI++] = (second + 2);
                }
                inc +=2;
            }
            inc += 2;
        }
        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : BoundingSphere.fromVertices(positions)
        });
    };

    return HemisphereOutlineGeometry;
});