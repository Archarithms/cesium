<p align="center">
<img src="https://github.com/AnalyticalGraphicsInc/cesium/wiki/logos/Cesium_Logo_Color.jpg" width="50%" />
</p>

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0.html) [![Docs](https://img.shields.io/badge/docs-online-orange.svg)](http://cesiumjs.org/tutorials.html)

Cesium is a JavaScript library for creating 3D globes and 2D maps in a web browser without a plugin. It uses WebGL for hardware-accelerated graphics, and is cross-platform, cross-browser, and tuned for dynamic-data visualization.

http://cesiumjs.org/

## Using This Repo

<p>This repo is a fork of v1.31 of Cesium. The built code is included in this repo. To use this version of Cesium, simply download the project and copy `Build/Cesium` into your app's static directory</p>

### Hemisphere examples

<p>Below is an example of creating a hemisphere volume and outline</p>

```javascript
/**
 * this example uses a sensor for the hemisphere object. it can handle a sensor with multiple faces
 * @param {Object} sensor the 3d volume object
 * @param {Object} Cesium the cesium instance
 * @param {String} type the type of volume to create, optional. `outline` will produce
 *                      an outline. anything else will produce a volume
 */
export const createsensor = (sensor, Cesium, type) => {
  const instances = [];
  let instanceId = 0;
  for (var i = 0; i < sensor.faces.length; i++) {
    var sector = sensor.faces[i];
    var degree = (sector.minAz < 0) ? sector.maxAz + (-sector.minAz) : Math.abs(sector.maxAz - sector.minAz);
    const nAngle = sector.boresightAz;

    var rotationMatrix = Cesium.Matrix4.fromRotationTranslation(
      new Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(-nAngle)),
      new Cesium.Cartesian3(0.0, 0.0, 0.0),
      new Cesium.Matrix4()
    );
    var transformMatrix = Cesium.Matrix4.multiplyByTranslation(
      Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromRadians(sensor.lon, sensor.lat)),
      new Cesium.Cartesian3(0.0, 0.0, 0.0),
      new Cesium.Matrix4()
    );
    var modelMatrix = Cesium.Matrix4.multiply(
      transformMatrix,
      rotationMatrix,
      new Cesium.Matrix4()
    );
    const geometryOptions = {
      radius: sensor.maxRange,
      minRange: sensor.minRange,
      minEl: sensor.minEl,
      maxEl: sensor.maxEl,
      angleAz: degree,
      stackPartitions: degree / 90 * 8,
      slicePartitions: degree / 90 * 8,
      vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL
    };

    let geometry;
    if (type && type === 'outline') {
      geometry = new Cesium.HemisphereOutlineGeometry(geometryOptions);
    } else {
      geometry = new Cesium.HemisphereGeometry(geometryOptions);
    }

    var instance = new Cesium.GeometryInstance({
      geometry,
      modelMatrix: modelMatrix,
      id: sensor.radar_id + i,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.AQUA.withAlpha(0.3)),
        show: new Cesium.ShowGeometryInstanceAttribute(true)
      }
    });
    instances.push(instance);
    instanceId += 1;
  }

  return new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance()
  });
};
```
