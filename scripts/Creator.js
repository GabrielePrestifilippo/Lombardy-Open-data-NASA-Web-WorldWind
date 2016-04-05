/*jshint -W117 */
/*jshint -W083 */

/*debugging vars*/
var label;

define([
    'src/WorldWind',

], function(
    WorldWind) {

    var DataCreator = function(globe) {

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_ERROR);
        this.wwd = new WorldWind.WorldWindow(globe);
        this.wwd.addLayer(new WorldWind.BMNGOneImageLayer());
        this.wwd.addLayer(new WorldWind.BingAerialWithLabelsLayer());
        this.wwd.addLayer(new WorldWind.CompassLayer());
        this.wwd.addLayer(new WorldWind.CoordinatesDisplayLayer(this.wwd));
        this.wwd.addLayer(new WorldWind.ViewControlsLayer(this.wwd));
        this.handle();
    };

    DataCreator.prototype.create = function(options) {
        var val = options.number;
        var q = "";

        if (options.keyword) {
            q = "&$q=" + options.keyword;
        }

        var self = this;
        var coords = {};
        var url;
        switch (options.type) {
            case 0:
                url = "https://www.dati.lombardia.it/resource/kf9b-rj2t.json?$where=((lat>0)AND(lng>0))&$limit=" + val + q;
                label = "denominazione";
                break;
            case 1:
                url = "https://www.dati.lombardia.it/resource/rbg8-vnzg.json?$where=((WGS84_X>0)AND(WGS84_Y>0))&$limit=" + val + q;
                label = "denominazione_museo";
                break;

            case 2:
                url = "https://www.dati.lombardia.it/resource/hqsw-ahvp.json?$where=((coorx>0)AND(coory>0))&$limit=" + val + q;
                label = "denom_autonomia";
                break;

            case 3:
                url = "https://www.dati.lombardia.it/resource/cf6w-iiw9.json?$where=((lat>0)AND(lng>0))&$limit=" + val + q;
                label = "denom_farmacia";
                break;

            case 4:
                url = "https://www.dati.lombardia.it/resource/xy9p-k9bj.json?$where=((wgs84_x>0)AND(wgs84_y>0))&$limit=" + val + q;
                label = "nome_agriturismo";
                break;
        }

        if (this.layer) {
            this.wwd.removeLayer(this.layer);
        }

        $.ajax({
            url: url
        }).done(function(res) {
            if (res.length < 1) {

                $("#alert").css("visibility", "visible");
                $("#alert").css("opacity", 1);
                return;
            }

            for (var x in res) {
                switch (options.type) {
                    case 0:
                        res[x].coordinates = [Number(res[x].location.longitude), Number(res[x].location.latitude)];
                        break;
                    case 1:
                        res[x].coordinates = res[x].location.coordinates;
                        break;
                    case 2:
                        res[x].coordinates = [Number(res[x].location.longitude), Number(res[x].location.latitude)];
                        break;
                    case 3:
                        res[x].coordinates = [Number(res[x].location.longitude), Number(res[x].location.latitude)];
                        break;
                    case 4:
                        res[x].coordinates = [Number(res[x].location.longitude), Number(res[x].location.latitude)];
                        break;
                }

            }
            res = GeoJSON.parse(res, {
                Point: 'coordinates'
            });
            res = JSON.stringify(res);
            self.layer = self.import(res, self.type);
        });
    };


    DataCreator.prototype.import = function(data, type) {
        var self = this;
        var layer = new WorldWind.RenderableLayer("layer");
        var polygonGeoJSON = new WorldWind.GeoJSONParser(data);
        polygonGeoJSON.load(this.shapeConfigurationCallback, layer, function() {
            self.start(layer);
        }, 1);
        this.wwd.addLayer(layer);
        this.layer=layer;
        return layer;
    };


    DataCreator.prototype.start = function(layer) {
        _self = this;

        var lat, lng;

        lng = layer.renderables[0].position.longitude;
        lat = layer.renderables[0].position.latitude;

        var anim = new WorldWind.GoToAnimator(this.wwd);
        this.wwd.redraw();

        anim.goTo(new WorldWind.Position(lat, lng, 800000), function() {});
    };


    DataCreator.prototype.handle = function() {
        var self = this;
        var highlightedItems = [];

        var handleMove = function(o) {
            var x = o.clientX,
                y = o.clientY;
            var redrawRequired = highlightedItems.length > 0; 

            for (var h = 0; h < highlightedItems.length; h++) {
                highlightedItems[h].highlighted = false;
            }
            highlightedItems = [];

            var pickList = self.wwd.pick(self.wwd.canvasCoordinates(x, y));
            if (pickList.objects.length > 0) {
                redrawRequired = true;
            }

            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    if (!pickList.objects[p].isTerrain) {
                        pickList.objects[p].userObject.highlighted = true;
                        highlightedItems.push(pickList.objects[p].userObject);
                    }
                }
            }

            if (redrawRequired) {
                self.wwd.redraw();
            }
        };

        self.wwd.addEventListener("mousemove", handleMove);

        var handlePick = function(o) {

            var x = o.clientX,
                y = o.clientY;

            var pickList = self.wwd.pick(self.wwd.canvasCoordinates(x, y));
            if (pickList.objects.length > 0) {
                for (var p = 0; p < pickList.objects.length; p++) {
                    if (!pickList.objects[p].isTerrain) {

                        self.fillBox(pickList.objects[p].userObject.attributes.properties);
                    }
                }
            }

        };
        self.wwd.addEventListener("click", handlePick);

    };

    DataCreator.prototype.fillBox = function(data) {
        $("#infoPoint").show();
        var myString = "";
        for (var x in data) {
            if (typeof(data[x]) == "string") {
                myString += "<b>" + x + "</b>: " + data[x] + "<br>";
            }
        }
        $("#textInfo").html(myString);
    };

    DataCreator.prototype.shapeConfigurationCallback = function(geometry, properties) {
        var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
        placemarkAttributes.imageScale = 1;
        placemarkAttributes.imageOffset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.3,
            WorldWind.OFFSET_FRACTION, 0.0);

        placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
            WorldWind.OFFSET_FRACTION, 0.5,
            WorldWind.OFFSET_FRACTION, 1.0);

        placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
        placemarkAttributes.drawLeaderLine = true;
        placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        placemarkAttributes.imageSource = "../images/placemark.png";


        var highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        highlightAttributes.imageScale = 1.2;


        var configuration = {};

        configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
        configuration.highlightAttributes = highlightAttributes;
        configuration.name = properties[label];

        configuration.attributes.properties = properties;

        return configuration;
    };

    return DataCreator;
});