/*global define*/
define([
    './BoundingSphere',
    './Cartesian2',
    './Cartesian3',
    './ComponentDatatype',
    './defaultValue',
    './defined',
    './DeveloperError',
    './Ellipsoid',
    './Geometry',
    './GeometryAttribute',
    './GeometryAttributes',
    './IndexDatatype',
    './Math',
    './PrimitiveType',
    './VertexFormat'
], function(
    BoundingSphere,
    Cartesian2,
    Cartesian3,
    ComponentDatatype,
    defaultValue,
    defined,
    DeveloperError,
    Ellipsoid,
    Geometry,
    GeometryAttribute,
    GeometryAttributes,
    IndexDatatype,
    CesiumMath,
    PrimitiveType,
    VertexFormat) {
    "use strict";


    var HemisphereGeometry = function(options) {

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var radius = defaultValue(options.radius, 10000);
        var stackPartitions = defaultValue(options.stackPartitions, 10);
        var slicePartitions = defaultValue(options.slicePartitions, 10);
        var angleAz = defaultValue(options.angleAz, 90);
        var minEl = defaultValue(options.minEl, 3);
        var maxEl = defaultValue(options.maxEl, 85);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

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
        this._stackPartitions = stackPartitions;
        this._slicePartitions = slicePartitions;
        this._angleAz = angleAz;
        this._minEl = minEl;
        this._maxEl = maxEl;
        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._workerName = 'createHemisphereGeometry';
    };

    HemisphereGeometry.packedLength = VertexFormat.packedLength + 6;

    HemisphereGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required');
        }
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._radius;
        array[startingIndex++]   = value._stackPartitions;
        array[startingIndex++] = value._slicePartitions;
        array[startingIndex++]   = value._angleAz;
        array[startingIndex++] = value._minEl;
        array[startingIndex]   = value._maxEl;
    };

    var scratchVertexFormat = new VertexFormat();
    var scratchOptions = {
        vertexFormat : scratchVertexFormat,
        radius : undefined,
        stackPartitions : undefined,
        slicePartitions : undefined,
        angleAz : undefined,
        minEl : undefined,
        maxEl : undefined
    };
    HemisphereGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required');
        }
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var radius = array[startingIndex++];
        var stackPartitions = array[startingIndex++];
        var slicePartitions = array[startingIndex++];
        var angleAz = array[startingIndex++];
        var minEl = array[startingIndex++];
        var maxEl = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.radius = radius;
            scratchOptions.stackPartitions = stackPartitions;
            scratchOptions.slicePartitions = slicePartitions;
            scratchOptions.angleAz = angleAz;
            scratchOptions.minEl = minEl;
            scratchOptions.maxEl = maxEl;
            return new HemisphereGeometry(scratchOptions);
        }

        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._radius = radius;
        result._stackPartitions = stackPartitions;
        result._slicePartitions = slicePartitions;
        result._angleAz = angleAz;
        result._minEl = minEl;
        result._maxEl = maxEl;

        return result;
    };
    HemisphereGeometry.createGeometry = function(hemisphereGeometry) {
        var radius = hemisphereGeometry._radius;
        var angleAz = hemisphereGeometry._angleAz;
        var minEl = hemisphereGeometry._minEl;
        var maxEl = hemisphereGeometry._maxEl;
        var vertexFormat = hemisphereGeometry._vertexFormat;

        var slicePartitions = hemisphereGeometry._slicePartitions;
        var stackPartitions = hemisphereGeometry._stackPartitions;
        var vertexCount = ((stackPartitions +1) * (slicePartitions +1)) + (3*((stackPartitions * 2) + (slicePartitions * 2)));
        var positions = new Float64Array(vertexCount * 3);

        var angleEl = maxEl - minEl;
        var aDiv = (angleEl / stackPartitions);
        var stEl = (90 - maxEl) / aDiv;
        var stStop = stEl + stackPartitions;

        var normals = new Float32Array(vertexCount * 3);

        //vertices and normals
        var index = 0;
        var indexN = 0;
        var count = [];
        var h = 0, i = 0, k = 0, l = 0;
        for (var lat=stEl; lat <= stStop; lat+=1) {
            var theta = (Math.PI * lat) / (180/aDiv);
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            for (var lon=0; lon <= slicePartitions; lon+=1) {
                var phi = (CesiumMath.TWO_PI * lon) / (slicePartitions * (360/angleAz));
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = -(sinPhi * sinTheta);
                var z = cosTheta;

                if (lat == stEl) {
                    normals[indexN++] = (-x);
                    normals[indexN++] = (z);
                    normals[indexN++] = (-y);
                    positions[index++] = (radius * x);
                    positions[index++] = (radius * y);
                    positions[index++] = (radius * z);
                    count.push(9,9,9);
                    if (lon >= 1 && lon < slicePartitions){
                        normals[indexN++] = (-x);
                        normals[indexN++] = (z);
                        normals[indexN++] = (-y);
                        positions[index++] = (radius * x);
                        positions[index++] = (radius * y);
                        positions[index++] = (radius * z);
                        count.push(8,0,9);
                    }
                }
                if (lat == stStop) {
                    normals[indexN++] = (x);
                    normals[indexN++] = (-z);
                    normals[indexN++] = (y);
                    positions[index++] = (radius * x);
                    positions[index++] = (radius * y);
                    positions[index++] = (radius * z);
                    count.push(9,9,9);
                    if (lon >= 1 && lon < slicePartitions){
                        normals[indexN++] = (x);
                        normals[indexN++] = (-z);
                        normals[indexN++] = (y);
                        positions[index++] = (radius * x);
                        positions[index++] = (radius * y);
                        positions[index++] = (radius * z);
                        count.push(8,0,9);
                    }
                }
                if (lat == stEl && h < stackPartitions){
                    normals[indexN++] = -x;
                    normals[indexN++] = z;
                    normals[indexN++] = -y;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    h+=1;
                    count.push(1,1,1);
                }
                if (lat == stStop && l < stackPartitions){
                    normals[indexN++] = x;
                    normals[indexN++] = -z;
                    normals[indexN++] = y;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    l+=1;
                    count.push(4,4,4);
                }
            }
        }
        for (var lat=stEl; lat <= stStop; lat+=1) {
            var theta = (Math.PI * lat) / (180/aDiv);
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            for (var lon=0; lon <= slicePartitions; lon+=1) {
                var phi = (CesiumMath.TWO_PI * lon) / (slicePartitions * (360/angleAz));
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = -(sinPhi * sinTheta);
                var z = cosTheta;

                if (lon == 0) {
                    normals[indexN++] = (x);
                    normals[indexN++] = (z);
                    normals[indexN++] = (y);
                    positions[index++] = (radius * x);
                    positions[index++] = (radius * y);
                    positions[index++] = (radius * z);
                    count.push(8,0,9);
                    if (lat >= stEl + 1 && lat < stStop){
                        normals[indexN++] = (x);
                        normals[indexN++] = (z);
                        normals[indexN++] = (y);
                        positions[index++] = (radius * x);
                        positions[index++] = (radius * y);
                        positions[index++] = (radius * z);
                        count.push(9,9,9);
                    }
                }
                if (lon == 0 && i < slicePartitions){
                    normals[indexN++] = x;
                    normals[indexN++] = z;
                    normals[indexN++] = y;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    i+=1;
                    count.push(2,2,2);
                }
            }
        }
        for (var lat=stEl; lat <= stStop; lat+=1) {
            var theta = (Math.PI * lat) / (180/aDiv);
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            for (var lon=0; lon <= slicePartitions; lon+=1) {
                var phi = (CesiumMath.TWO_PI * lon) / (slicePartitions * (360/angleAz));
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = -(sinPhi * sinTheta);
                var z = cosTheta;

                if (lon == slicePartitions) {
                    normals[indexN++] = (-z);
                    normals[indexN++] = (-y);
                    normals[indexN++] = (x);
                    positions[index++] = (radius * x);
                    positions[index++] = (radius * y);
                    positions[index++] = (radius * z);
                    count.push(8,0,9);
                    if (lat >= stEl + 1 && lat < stStop){
                        normals[indexN++] = (-z);
                        normals[indexN++] = (-y);
                        normals[indexN++] = (x);
                        positions[index++] = (radius * x);
                        positions[index++] = (radius * y);
                        positions[index++] = (radius * z);
                        count.push(9,9,9);
                    }
                }
                if (lon == slicePartitions && k < slicePartitions){
                    normals[indexN++] = -z;
                    normals[indexN++] = -y;
                    normals[indexN++] = x;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    positions[index++] = 0.0;
                    k+=1;
                    count.push(3,3,3);
                }
            }
        }
        for (var lat=stEl; lat <= stStop; lat+=1) {
            var theta = (Math.PI * lat) / (180/aDiv);
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);

            for (var lon=0; lon <= slicePartitions; lon+=1) {
                var phi = (CesiumMath.TWO_PI * lon) / (slicePartitions * (360/angleAz));
                var sinPhi = Math.sin(phi);
                var cosPhi = Math.cos(phi);

                var x = cosPhi * sinTheta;
                var y = -(sinPhi * sinTheta);
                var z = cosTheta;

                normals[indexN++] = (x);
                normals[indexN++] = (y);
                normals[indexN++] = (z);
                positions[index++] = (radius * x);
                positions[index++] = (radius * y);
                positions[index++] = (radius * z);
                count.push(8,0,9);
            }
        }
        // console.log(positions.length);
        // console.log(positions);
        // console.log(count.length);
        // console.log(count);
        var attributes = new GeometryAttributes();

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : normals
            });
        }
        //indices
        var numIndices = 6 * vertexCount;
        var indices = IndexDatatype.createTypedArray(vertexCount, numIndices);

        var indexI = 0;
        var count2 = 0;
        for (var latNum = 0; latNum <= (stackPartitions); latNum++) {
            for (var lonNum = 0; lonNum < (slicePartitions); lonNum++) {
                if (latNum == 0) {
                    var first = lonNum * 3;
                    indices[indexI++] = (first);
                    indices[indexI++] = (first + 2);
                    indices[indexI++] = (first + 1);
                    count2 += 3;
                }
                if (latNum == stackPartitions) {
                    var second = (slicePartitions * 3) + (lonNum * 3);
                    indices[indexI++] = (second);
                    indices[indexI++] = (second + 1);
                    indices[indexI++] = (second + 2);
                    count2 += 3;
                }
            }
        }
        for (var latNum = 0; latNum < (stackPartitions); latNum++) {
            for (var lonNum = 0; lonNum < (slicePartitions -1); lonNum++) {

                var first = count2;

                if (lonNum == 0){
                    indices[indexI++] = (first);
                    indices[indexI++] = (first + 1);
                    indices[indexI++] = (first + 2);
                    count2 += 3;
                }
            }
        }
        for (var latNum = 0; latNum < (stackPartitions); latNum++) {
            for (var lonNum = 0; lonNum < (slicePartitions); lonNum++) {

                var first = count2;

                if (lonNum == slicePartitions - 1){
                    indices[indexI++] = (first);
                    indices[indexI++] = (first + 2);
                    indices[indexI++] = (first + 1);
                    count2 += 3;
                }
            }
        }
        for (var latNum = 0; latNum < stackPartitions; latNum++) {
            for (var lonNum = 0; lonNum < slicePartitions; lonNum++) {

                var first = ((latNum * (slicePartitions + 1)) + lonNum) + count2;
                var second = (first + slicePartitions + 1);

                indices[indexI++] = (first);
                indices[indexI++] = (second);
                indices[indexI++] = (first + 1);

                indices[indexI++] = (second);
                indices[indexI++] = (second + 1);
                indices[indexI++] = (first + 1);
            }
        }
        // console.log(count2);
        // console.log(indices);
        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : BoundingSphere.fromVertices(positions)
        });
    };

    return HemisphereGeometry;
});
