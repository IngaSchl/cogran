'use strict';

const Turf = require('turf');
const isUndefined = require('lodash/isUndefined');
const Logger = require('../logger');
const objectAssign = require('object-assign');
const shortid = require('shortid');
const d3 = require('d3');
const SiSt = require('simple-statistics');

function linearRegression(source, target, options, progress) {
	
  const nClassMask = objectAssign({}, options.binary);
  // console.log(nClassMask);
  // console.log("landuse: " + nClassMask.features[0].properties.landuse);
  const SourceMask = intersect(source, nClassMask);
  // console.log(SourceMask);
  // console.log(SourceMask.features[0].properties);
  
  target.features.forEach(d => {
    d.properties.targetId = shortid.generate();
  });  
 
  SourceMask.features.forEach(d => { // d = SourceMask.features[0..X];
   d.properties.Asc = Turf.area(d);
   d.properties.Psc = (d.properties.Asc / d.properties.parentArea) * d.properties[options.attr];
  });

  const regressionData = SourceMask.features.map(d => [d.properties.landuse, d.properties.Asc, d.properties.Psc]);
  // console.log('reg.Data: ' +regressionData);
  
  const Atsc = intersect(SourceMask, target);
  
  /* neuen Flächeninhalt [m^2] berechnen */
  Atsc.features.forEach(d => { // d = SourceMask.features[0..X];
   d.properties.Atsc = Turf.area(d);
 });
  
  //
  // distinct() für landuse-typen in regressiondata => n
  // for(i<n) => const landuse + 'i';
  
  var distinct = [];
  for(var i=0; i< regressionData.length; i++){
	  if (distinct.includes(regressionData[i][0]) == false){
		distinct.push(regressionData[i][0]);
	  }
  }
  
  for(var i=0; i< distinct.length; i++){
	  this['landuse' +i] = [];
	  for(var j=0; j< regressionData.length; j++){
		if(regressionData[j][0] == distinct[i]){
		  this['landuse' +i].push(new Array(regressionData[j][1], regressionData[j][2]));
	    }		
	  }
	  //console.log(this['landuse' +i]);
	  
	  this['regressionLine' +i] = SiSt.linearRegressionLine(SiSt.linearRegression(this['landuse' +i]));
	  //console.log(this['regressionLine' +i](0) + ', ' + this['regressionLine' +i](2));
  }
  
  // console.log('Atsc: ' +Atsc.features);
  // console.log('Asc: ' +Atsc.features[0].properties.Asc);
  
  // //
  // console.log('n: ' + Atsc.features.length);
  for(var i=0; i< distinct.length; i++){
	  this['Atsc' +i] = [];
	  for(var j=0; j< Atsc.features.length; j++){
		  if(Atsc.features[j].properties.landuse == distinct[i]){
			  //this['Atsc' +i].push(Atsc.features[j]);
			  Atsc.features[j].properties.Ptx = this['regressionLine' +i](Atsc.features[j].properties.Atsc);
			  // console.log('Ptx: ' +Atsc.features[j].properties.targetId + ', '+Atsc.features[j].properties.Ptx);
		  }
	  }
  }

  // console.log('target: ' +target.features);
  
  target.features.forEach(d => {
	d.properties.Pt = 0;
	// console.log(d.properties.Pt);
	
	for(var i=0; i< Atsc.features.length; i++){
		if(Atsc.features[i].properties.targetId == d.properties.targetId){
			d.properties.Pt += Atsc.features[i].properties.Ptx;
		}
	} 
	
	// console.log('Pt: ' +d.properties.Pt);

    delete d.properties.targetId;
  }
);

  return target;
}

function intersect(a, b) {

  let resultFeatures = [];

  a.features.forEach((d, i) => {
	  
    Logger.info(`[linearRegression][intersect][${i}/${a.features.length}]`);
  
    b.features.forEach(e => {
      const isIntersect = Turf.intersect(d, e);

      if(isIntersect && Turf.area(isIntersect) > 0) {
        isIntersect.properties = objectAssign({}, e.properties, d.properties);
        isIntersect.properties.parentArea = Turf.area(d);
        resultFeatures.push(isIntersect);
      }
    });
  });

  return Turf.featurecollection(resultFeatures);
}

module.exports = linearRegression;
