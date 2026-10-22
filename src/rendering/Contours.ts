import * as THREE from 'three';

/** Single resolve pass: the scene's own depth/color classify inward edges.
 * Similar colors suppress the contour. This is our screen-space adaptation,
 * not Oskar Stalberg's world-space contrast texture / vertex raycasting. */
export class ContourRenderer {
  private readonly target: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly material: THREE.ShaderMaterial;
  private readonly triangle: THREE.Mesh;
  private readonly size = new THREE.Vector2();
  readonly supported: boolean;
  // Opt-in study only: the measured software cost outweighs its subtle gain.
  strength = new URLSearchParams(window.location.search).has('contours') ? .20 : 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.supported = renderer.extensions.has('EXT_color_buffer_float');
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
      samples: Math.min(4, renderer.capabilities.maxSamples),
    });
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        sceneColor: { value: this.target.texture }, sceneDepth: { value: this.target.depthTexture },
        pixel: { value: new THREE.Vector2() }, nearFar: { value: new THREE.Vector2() },
        perspective: { value: 0 }, strength: { value: this.strength },
      },
      depthTest: false, depthWrite: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D sceneColor;
        uniform sampler2D sceneDepth;
        uniform vec2 pixel;
        uniform vec2 nearFar;
        uniform float perspective;
        uniform float strength;
        varying vec2 vUv;
        #include <packing>
        float eyeDepth(float depth){
          return perspective>.5 ? -perspectiveDepthToViewZ(depth,nearFar.x,nearFar.y)
            : -orthographicDepthToViewZ(depth,nearFar.x,nearFar.y);
        }
        float edge(vec2 offset,vec3 center,float depth){
          vec2 at=clamp(vUv+offset,vec2(0.),vec2(1.));
          float other=eyeDepth(texture2D(sceneDepth,at).r);
          vec3 color=texture2D(sceneColor,at).rgb;
          float contrast=length(center-color)/(length(center)+length(color)+.05);
          return smoothstep(.045,.16,other-depth)*smoothstep(.06,.22,contrast);
        }
        void main(){
          float z=texture2D(sceneDepth,vUv).r;
          float depth=eyeDepth(z);
          vec3 color=texture2D(sceneColor,vUv).rgb;
          float outline=0.;
          // Coherent flat regions need no neighbor reads.
          if(fwidth(depth)>.035) outline=max(max(edge(vec2(pixel.x,0.),color,depth),edge(vec2(-pixel.x,0.),color,depth)),
            max(edge(vec2(0.,pixel.y),color,depth),edge(vec2(0.,-pixel.y),color,depth)));
          color*=1.-outline*strength;
          gl_FragColor=vec4(color,1.);
          if(z<.999999){
            #include <tonemapping_fragment>
          }
          #include <colorspace_fragment>
        }
      `,
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
    this.triangle = new THREE.Mesh(geometry,this.material);
    this.triangle.frustumCulled = false;
    this.scene.add(this.triangle);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    const renderer = this.renderer;
    const autoReset = renderer.info.autoReset;
    renderer.info.autoReset = false;
    renderer.info.reset();
    if (!this.supported || this.strength === 0) {
      renderer.render(scene,camera);
      renderer.info.autoReset = autoReset;
      return;
    }
    renderer.getDrawingBufferSize(this.size);
    if(this.target.width !== this.size.x || this.target.height !== this.size.y) {
      this.target.setSize(this.size.x,this.size.y);
      this.material.uniforms.pixel.value.set(1/this.size.x,1/this.size.y);
    }
    this.material.uniforms.nearFar.value.set(camera.near,camera.far);
    this.material.uniforms.perspective.value = camera instanceof THREE.PerspectiveCamera ? 1 : 0;
    this.material.uniforms.strength.value = this.strength;
    renderer.setRenderTarget(this.target);
    renderer.render(scene,camera);
    renderer.setRenderTarget(null);
    renderer.render(this.scene,this.camera);
    renderer.info.autoReset = autoReset;
  }

  dispose() {
    this.target.dispose();this.target.depthTexture?.dispose();
    this.triangle.geometry.dispose();this.material.dispose();
  }
}
