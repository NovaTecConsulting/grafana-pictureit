import _ from "lodash";
import {MetricsPanelCtrl} from "app/plugins/sdk";
import "./sprintf.js";
import "./angular-sprintf.js";
import getWidth from './stringwidth/strwidth.js';

const panelDefaults = {
    colorMappings: [],
    colorMappingMap: [],
    valueMappings: [],
    metricValues: [],
    seriesList: [],
    series: [],
    bgimage: '',
    sensors: [],
    groups: [],
    useLabelGroupings: false,
    height: '400px',
    width: '100px',
    templateSrv: null
};

export class PictureItCtrl extends MetricsPanelCtrl {


    constructor($scope, $injector, templateSrv) {
        super($scope, $injector);
        _.defaults(this.panel, panelDefaults);
        this.templateSrv = templateSrv;
        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('panel-initialized', this.render.bind(this));
        this.events.on('data-received', this.onDataReceived.bind(this));
        this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    }

    onDataReceived(dataList) {
        var dataListLength = dataList.length;
        this.panel.metricValues = [];
        for (var series = 0; series < dataListLength; series++) {
            this.panel.metricValues.push({
                name: dataList[series].target,
                value: dataList[series].datapoints[dataList[series].datapoints.length - 1][0]
            });
        }

        this.render();
    }

    deleteSensor(index) {
        this.panel.sensors.splice(index, 1);
    }

    addSensor() {
        if (this.panel.sensors.length === 0) {
            this.panel.sensors.push(
                new Sensor('Series Name', 200, 200, '%.2f', 'rgba(0, 0, 0, 0.58)', '#000000', 22, 'rgb(251, 4, 4)', true)
            );
        } else {
            var lastSensor = this.panel.sensors[this.panel.sensors.length - 1];
            this.panel.sensors.push(
                new Sensor(lastSensor.metric, 200, 200, lastSensor.format, lastSensor.bgcolor, lastSensor.color, lastSensor.size, lastSensor.bordercolor, true)
            );
        }
    }

    moveSensorUp(index) {
        var sensor = this.panel.sensors[index]
        this.panel.sensors.splice(index, 1)
        this.panel.sensors.splice(index-1,0,sensor);
    }

    moveSensorDown(index) {
        var sensor = this.panel.sensors[index]
        this.panel.sensors.splice(index, 1)
        this.panel.sensors.splice(index+1,0,sensor);
    }

    deleteGroup(index) {
        this.panel.groups.splice(index, 1);
    }

    addGroup() {
        this.panel.groups.push(
            new Group('A', "left", 200, 200)
        );
    }

    getAvailableGroups() {

        var result = ctrl.panel.groups.map(g => g.name);
        alert("RESULT: " + JSON.stringify(result))
        return result;
    }

    onInitEditMode() {
        this.addEditorTab('Sensor', 'public/plugins/bessler-pictureit-panel/editor.html', 2);
        this.addEditorTab('Color Mapping', 'public/plugins/bessler-pictureit-panel/colors.html', 3);
        this.addEditorTab('Value Color Mapping', 'public/plugins/bessler-pictureit-panel/mappings.html', 4);
    }

    link(scope, elem, attrs, ctrl) {
        const $panelContainer = elem.find('.panel-container');

        function pixelStrToNum(str) {
            return parseInt(str.substr(0, str.length - 2));
        }

        function getGroup(name) {
            for (let group of ctrl.panel.groups) {
                if(group.name == name){
                    return group;
                }
            }
            return null;
        }

        function render() {
            if (!ctrl.panel.sensors) {
                return;
            }
            let width = pixelStrToNum($panelContainer.css("width"));
            let height = pixelStrToNum($panelContainer.css("height"));
            let metricMap = _.keyBy(ctrl.panel.metricValues, value => value.name);
            let valueMappingsMap = _.keyBy(ctrl.panel.valueMappings, mapping => mapping.value);



            for (let sensor of ctrl.panel.sensors) {
                var sensorWidth = getWidth(sensor.displayName, { font: 'Arial', size: sensor.size }) + 20;
                if(ctrl.panel.useLabelGroupings){
                    var group = getGroup(sensor.group.name)
                    if(group != null && group.sameSize){
                        var newValue = Math.max(group.width, sensorWidth);
                        group.width = newValue;
                        sensor.width = newValue;
                    }else{
                        sensor.panelWidth = sensorWidth + "px";  
                        sensor.width = sensorWidth;
                    }
                }else{
                    sensor.panelWidth = sensorWidth + "px";  
                    sensor.width = sensorWidth;
                }
            }

            for (let sensor of ctrl.panel.sensors) {
                if(ctrl.panel.useLabelGroupings && group.sameSize){
                    var group = getGroup(sensor.group.name)
                    if(group != null){
                        sensor.panelWidth = group.width + "px";  
                        sensor.width = group.width;
                    }
                }
                sensor.visible = sensor.xlocation < width && sensor.ylocation < height;
                if(!ctrl.panel.useLabelGroupings){
                    sensor.ylocationStr = sensor.ylocation.toString() + "px";
                    sensor.xlocationStr = sensor.xlocation.toString() + "px";
                }else{
                    alignSensors();
                }
                sensor.sizeStr = sensor.size.toString() + "px";
                sensor.bgcolor = 'rgb(64, 64, 64)';
                sensor.bordercolor = 'rgb(64, 64, 64)';
                
                if(sensor.rectangular){
                    sensor.borderRadius = '5%'
                }else{
                    sensor.borderRadius = '50%'
                }

                if(sensor.link_url != undefined) {
                    sensor.resolvedLink =ctrl.templateSrv.replace(sensor.link_url);
                }

                //We need to replace possible variables in the sensors name
                var effectiveName = ctrl.templateSrv.replace(sensor.metric);

                var mValue = metricMap[effectiveName];
                if (mValue === undefined) {
                    mValue = {name: "dummy", value: 'null'};
                }

                var valueMapping = valueMappingsMap[mValue.value];

                if (valueMapping !== undefined) {
                    let colorMapping = ctrl.panel.colorMappingMap[valueMapping.colorName];
                    if (colorMapping !== undefined) {
                        sensor.bgcolor = colorMapping.color;
                        sensor.bordercolor = colorMapping.color;
                    }
                }

                //finally format the value itself
                sensor.valueFormatted = sprintf(sensor.format,mValue.value);
            }
        }

        function alignSensors(){
            for (let group of ctrl.panel.groups) {
                group.nextTop = undefined;
                group.nextX = undefined;
            }
            for (let sensor of ctrl.panel.sensors) {
                var sensorHeight = sensor.size + 30;
                var sensorWidth = sensor.width + 10;
                var group = getGroup(sensor.group.name)
                if(group.alignment == "left"){
                    if(group.nextTop === undefined){
                        group.nextTop = group.y;
                    }
                    sensor.ylocationStr = group.nextTop + "px";
                    sensor.xlocationStr = group.x + "px";
                    group.nextTop = group.nextTop + sensorHeight;
                } else if(group.alignment == "middle"){
                    if(group.nextTop === undefined){
                        group.nextTop = group.y;
                    }
                    sensor.ylocationStr = group.nextTop + "px";
                    if(group.sameSize){
                        sensor.xlocationStr = (group.x - (group.width/2)) + "px";
                    }else{
                        sensor.xlocationStr = (group.x - (sensor.width/2))+ "px";
                    }
                    group.nextTop = group.nextTop + sensorHeight;
                } else if(group.alignment == "right"){
                    if(group.nextTop === undefined){
                        group.nextTop = group.y;
                    }
                    sensor.ylocationStr = group.nextTop + "px";
                    if(group.sameSize){
                        sensor.xlocationStr = (group.x - group.width) + "px";
                    }else{
                        sensor.xlocationStr = (group.x - sensor.width)+ "px";
                    }
                    group.nextTop = group.nextTop + sensorHeight;
                } else if(group.alignment == "top"){
                    if(group.nextX === undefined){
                        group.nextX = group.x;
                    }
                    sensor.xlocationStr = group.nextX + "px";
                    sensor.ylocationStr = group.y + "px";
                    group.nextX = group.nextX + sensorWidth;
                }    
            }
        }

        this.events.on('render', function () {
            render();
            ctrl.renderingCompleted();
        });
    }

    //------------------
    // Color mapping stuff
    //------------------

    addColorMapping() {
        this.panel.colorMappings.push(new ColorMapping('name', '#FFFFFF'));
        this.refreshColorMappings();
    }

    removeColorMapping(map) {
        var index = _.indexOf(this.panel.colorMappings, map);
        this.panel.colorMappings.splice(index, 1);
        this.refreshColorMappings();
    }

    refreshColorMappings() {
        this.panel.colorMappingMap = _.keyBy(this.panel.colorMappings, mapping => mapping.name);
        this.render();
    }


    //------------------
    // Mapping stuff
    //------------------

    addValueMappingMap() {
        this.panel.valueMappings.push(new ValueColorMapping('value', ''));
    }

    removeValueMappingMap(toRemove) {
        var index = _.indexOf(this.panel.valueMappings, toRemove);
        this.panel.valueMappings.splice(index, 1);
        this.render();
    }

    /* addRangeMappingMap() {
     this.panel.rangeMappingMap.push({from: '', to: '', text: ''});
     }

     removeRangeMappingMap(rangeMap) {
     var index = _.indexOf(this.panel.rangeMaps, rangeMap);
     this.panel.rangeMappingMap.splice(index, 1);
     this.render();
     };*/
}

function ValueColorMapping(value,
                           colorName) {
    'use strict';
    this.value = value;
    this.colorName = colorName;
}


function ColorMapping(name, color) {
    'use strict';
    this.name = name;
    this.color = color;
}

function Sensor(metric,
                xlocation,
                ylocation,
                format,
                bgcolor,
                fontColor,
                size,
                bordercolor,
                visible) {
    'use strict';
    this.metric = metric;
    this.xlocation = xlocation;
    this.ylocation = ylocation;
    this.format = format;
    this.bgcolor = bgcolor;
    this.fontColor = fontColor;
    this.size = size;
    this.bordercolor = bordercolor;
    this.visible = visible;
    this.renderValue = false;
    this.valueFormatted = '';
    this.valueUnit = '';
    this.displayName = '';
    this.link_url = '';
    this.resolvedLink = '';
    this.rectangular = false;
    this.group = 'A';
}

function Group(name,alignment,x,y){
    'use strict';
    this.name = name;
    this.alignment = alignment;
    this.x = x;
    this.y = y;
    this.sameSize = false;
    this.width = 100;
}
PictureItCtrl.templateUrl = 'module.html';
