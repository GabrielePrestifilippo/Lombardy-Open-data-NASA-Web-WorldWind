/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ColladaLoader
 */

define([
        '../../error/ArgumentError',
        './ColladaAsset',
        './ColladaImage',
        './ColladaMaterial',
        './ColladaMesh',
        './ColladaNode',
        './ColladaScene',
        './ColladaUtils',
        '../../util/Logger'
    ],
    function (ArgumentError,
              ColladaAsset,
              ColladaImage,
              ColladaMaterial,
              ColladaMesh,
              ColladaNode,
              ColladaScene,
              ColladaUtils,
              Logger) {
        "use strict";

        /**
         * Constructs a ColladaLoader
         * @alias ColladaLoader
         * @constructor
         * @classdesc Represents a Collada Loader. Fetches and parses a collada document and returns the
         * necessary information to render the collada model.
         * @param {Position} position The model's geographic position.
         * @param {Object} config Configuration options for the loader.
         * <ul>
         *  <li>filePath - the path to the collada file</li>
         * </ul>
         */
        var ColladaLoader = function (position, config) {

            if (!position) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ColladaLoader", "constructor", "missingPosition"));
            }

            this.position = position;

            this.filePath = '/';

            this.init(config);
        };

        /**
         * Initialization of the ColladaLoader
         * @param {Object} config Configuration options for the loader.
         * <ul>
         *  <li>filePath - the path to the collada file</li>
         * </ul>
         */
        ColladaLoader.prototype.init = function (config) {
            if (config) {
                this.filePath = config.filePath || '/';
            }

            this.scene = {
                type: "SceneTree",
                filePath: this.filePath,
                images: {},
                metadata: {},
                materials: {},
                meshes: {},
                root: {children: []}
            };

            this.xmlDoc = null;
        };

        /**
         * Fetches and parses a collada file
         * @param {String} url The url to the collada .dae file.
         * @param {Function} cb A callback function to call with the result when the parsing is done.
         * @returns {ColladaScene} A renderable shape.
         */
        ColladaLoader.prototype.load = function (url, cb) {

            if (url.indexOf("://") === -1) {
                url = this.filePath + url;
            }

            ColladaUtils.fetchFile(url, function (data) {

                if (!data) {
                    var colladaScene = null;
                }
                else {

                    try {
                        colladaScene = this.parse(data);
                    }
                    catch (e) {
                        colladaScene = null;
                        Logger.log(Logger.LEVEL_SEVERE, "error parsing collada file: " + e);
                    }
                }

                cb(colladaScene);

            }.bind(this));
        };

        /**
         * Parses a collada file
         * @param {XML} data The raw XML data of the collada file.
         * @returns {ColladaScene} A renderable shape.
         */
        ColladaLoader.prototype.parse = function (data) {

            this.init();

            var parser = new DOMParser();
            this.xmlDoc = parser.parseFromString(data, "text/xml");

            var iNodes = this.xmlDoc.querySelectorAll('library_nodes node');
            var eNodes = this.xmlDoc.querySelectorAll("library_effects effect");

            this.scene.metadata = ( new ColladaAsset(this.xmlDoc) ).parse();
            this.parseLib('visual_scene', iNodes);
            this.parseLib('library_geometries');
            this.parseLib('library_materials', eNodes);
            this.parseLib('library_images');

            this.xmlDoc = null;

            return new ColladaScene(this.position, this.scene);
        };

        /**
         * Parses a collada library tag.
         * @param {String} libName The library tag name.
         * @param {NodeList} extraNodes Nodes from library_nodes or effects form library_effects
         */
        ColladaLoader.prototype.parseLib = function (libName, extraNodes) {

            var libs = this.xmlDoc.getElementsByTagName(libName);
            var libNodes = [];

            if (libs && libs.length) {
                libNodes = libs[0].childNodes;
            }

            for (var i = 0; i < libNodes.length; i++) {

                var libNode = libNodes[i];

                if (libNode.nodeType !== 1) {
                    continue;
                }

                switch (libNode.nodeName) {

                    case 'node':
                        var node = ( new ColladaNode() ).parse(libNode, extraNodes);
                        if (node) {
                            this.scene.root.children.push(node);
                        }
                        break;

                    case 'geometry':
                        var geometryId = libNode.getAttribute("id");
                        var xmlMesh = libNode.querySelector("mesh");
                        var mesh = ( new ColladaMesh(geometryId) ).parse(xmlMesh);
                        if (mesh) {
                            this.scene.meshes[geometryId] = mesh;
                        }
                        break;

                    case 'material':
                        var materialId = libNode.getAttribute("id");
                        var iEffect = libNode.querySelector("instance_effect");
                        var effectId = iEffect.getAttribute("url").substr(1);
                        var effect = ColladaUtils.querySelectorById(extraNodes, effectId);
                        var material = ( new ColladaMaterial(materialId) ).parse(effect);
                        if (material) {
                            this.scene.materials[materialId] = material;
                        }
                        break;

                    case 'image':
                        var imageId = libNode.getAttribute("id");
                        var imageName = libNode.getAttribute("name");
                        var image = ( new ColladaImage(imageId, imageName) ).parse(libNode);
                        if (image) {
                            this.scene.images[imageId] = image;
                        }
                        break;

                    default:
                        break;
                }
            }

        };

        return ColladaLoader;

    });