/*
 * WebGL core teaching framwork 
 * (C)opyright Hartmut Schirmacher, hschirmacher.beuth-hochschule.de 
 *
 * Module: Scene
 *
 * This module defines the scene to be drawn.
 *
 * A Scene object has a draw() method to draw itself, plus some
 * public attributes that may be used by animation functions etc:
 *
 * Scene.world:       the root node of the scene, of type SceneNode
 *
 * Scene.camera:      the camera to be used, consisting of two attributes:
 *                    camera.viewMatrix and camera.projectionMatrix.
 * 
 * Scene.drawOptions: array of strings defining on/off drawing options. 
 *                    this is potentially used by HtmlController to create
 *                    the corresponding check boxes in the HTML document.
 *
 */


/* requireJS module definition */
define(["jquery", "gl-matrix", 
        "program", "shaders", "scene_node", "texture", "light", "material",
        "models/parametric"], 
       (function($, glmatrix, 
                 Program, shaders, SceneNode, texture, light, material,
                 parametric ) {

    "use strict";
                                        
            // a simple scene is an object with a few objects and a draw() method
            var Scene = function(gl) {

                // store the WebGL rendering context
                this.gl = gl;  
                
                // create WebGL program using constant blue color
                var prog_blue = new Program(gl, shaders("minimal_vs"), 
                                                shaders("frag_color_fs") );
                prog_blue.use();
                prog_blue.setUniform("fragColor", "vec4", [0.0, 0.0, 1.0, 1.0]);
                
                // WebGL program for using phong illumination 
                var prog_phong = new Program(gl, shaders("phong_vs"), 
                                                 shaders("phong_fs")  );
                prog_phong.use();
                prog_phong.setUniform("ambientLight", "vec3", [0.4,0.4,0.4]);
        
                ///////////////////////////////////////////////////////////////////
                //Texturobjekte anlegen
                this.myTex0 = new texture.Texture2D(gl,"textures/earth_month04.jpg");
                this.myTex1 = new texture.Texture2D(gl,"textures/earth_at_night_2048.jpg");
                this.myTex2 = new texture.Texture2D(gl,"textures/earth_bathymetry_4096");
                this.myTex3 = new texture.Texture2D(gl,"textures/earth_clouds_2048.jpg");
        
                // WebGL program for using planet illumination
                this.prog_planet= new Program(gl, shaders("planet_vs"),
                                                shaders("planet_fs")  );
                this.prog_planet.use();
                this.prog_planet.setUniform("ambientLight", "vec3", [0.4,0.4,0.4]);
        
                // register all programs in this list for setting the projection matrix later
                this.programs = [prog_blue, prog_phong, this.prog_planet];
                
                // light source 
                this.sun = new light.DirectionalLight("light",  {"direction": [-1,0,0], "color": [1,1,1] }, [prog_phong] );
                this.sunNode   = new SceneNode("SunNode", [this.sun], this.prog_planet);
                                
                // equator ring for orientation
                this.ringMaterial = new material.PhongMaterial("material", 
                                                                    {"ambient":   [0.5,0.3,0.3],
                                                                     "diffuse":   [0.8,0.2,0.2],
                                                                     "specular":  [0.4,0.4,0.4],
                                                                     "shininess": 90
                                                                     });
                this.ringGeometry = new parametric.Torus(gl, 1.2, 0.04, {"uSegments":80, "vSegments":40});
                this.ringNode     = new SceneNode("EquatorNode", [this.ringMaterial, this.ringGeometry], prog_phong);

                // earth
                this.earthMaterial = new material.PhongMaterial("material",
                                                        {"ambient":   [0.4,0.4,0.4],
                                                        "diffuse":   [1.0,1.0,1.0],
                                                        "specular":  [0.1,0.1,0.1],
                                                        "shininess": 10
                                                       });
                this.earthGeometry = new parametric.Sphere(gl, 1.0, {});
                this.earthNode    = new SceneNode("EarthNode", [this.earthMaterial, this.earthGeometry], this.prog_planet);
        



                this.gridMaterial = new material.PhongMaterial("material", 
                                                                {"ambient":   [0.5,0.3,0.3],
                                                                    "diffuse":   [0.8,0.2,0.2],
                                                                    "specular":  [0.4,0.4,0.4],
                                                                    "shininess": 10
                                                                    });
                // earth with wireframes
                this.earthWithWireframesGeometry = new parametric.Sphere(gl, 0.9, {"uSegments":80, "vSegments":40,"wireframes":true});
                this.earthWithWireframesNode = new SceneNode("EarthWithWireframesNode", [this.gridMaterial, this.earthWithWireframesGeometry], prog_blue);





                // the poles are modeled on the Z axis, so swap z and y axes
                mat4.rotate(this.ringNode.transformation, Math.PI/2.0, [1,0,0]);
                mat4.rotate(this.earthNode.transformation, Math.PI/2.0, [1,0,0]);
                mat4.rotate(this.earthWithWireframesNode.transformation, Math.PI/2.0, [1,0,0]);


                // the world node - this is potentially going to be accessed from outside
                this.world  = new SceneNode("world", [this.sunNode, this.ringNode, this.earthNode, this.earthWithWireframesNode], prog_blue);
                
                // initial camera parameters
                var c = gl.canvas;
                var aspectRatio = c.width / c.height;
                this.camera = {};
                this.camera.viewMatrix = mat4.lookAt([0,0.5,3], [0,0,0], [0,1,0]);
                this.camera.projectionMatrix = mat4.perspective(45, aspectRatio, 0.01, 100);
        
                // for the UI - this will be accessed directly by HtmlController
                this.drawOptions = { "Planet": false, "Ring": false, "PlanetAsWireframe": false, "LightNights": false, "Clouds": false};
            }; // Scene constructor
            
            // draw the scene, starting at the root node
            Scene.prototype.draw = function() {
                
                // shortcut
                var gl = this.gl;
                
                // switch grid on/off
                this.ringNode.visible = this.drawOptions["Ring"];
                this.earthNode.visible = this.drawOptions["Planet"];
                this.earthWithWireframesNode.visible = this.drawOptions["PlanetAsWireframe"];
                
                //Texturen gleichzeitig aktivieren, via Texture Units 0 und 1
                this.prog_planet.use();
                this.prog_planet.setUniform("booleanNight", "bool", this.drawOptions["LightNights"]);
                this.prog_planet.setUniform("boolClouds", "bool", this.drawOptions["Clouds"]);
                this.prog_planet.setTexture("daylightTexture", 0, this.myTex0);
                this.prog_planet.setTexture("nightlightTexture",1, this.myTex1);
                this.prog_planet.setTexture("bathymetryTexture",2, this.myTex2);
                this.prog_planet.setTexture("cloudTexture",3, this.myTex3);
        
                // set camera's projection matrix in all programs
                for(var i=0; i<this.programs.length; i++) {
                    var p = this.programs[i];
                    p.use();
                    p.setUniform("projectionMatrix", "mat4", this.camera.projectionMatrix);
                };
                                    
                // initially set model-view matrix to the camera's view matrix
                var modelView = this.camera.viewMatrix;
                
                // enable depth testing, keep fragments with smaller depth values
                gl.enable(gl.DEPTH_TEST); 
                gl.depthFunc(gl.LESS);  
                                
                // clear color and depth buffers
                gl.clearColor(1.0, 1.0, 1.0, 1.0); 
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

                // start drawing with the root node
                this.world.draw(gl, null, modelView);

            }; // Scene draw()
            
        return Scene;
    
})); // define module
        

