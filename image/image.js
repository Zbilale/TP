const dropArea = document.getElementById('drop-area');
const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');
const saturationSlider = document.getElementById('saturation');
const hueSlider = document.getElementById('hue');
const blurSlider = document.getElementById('blur');
const sharpenSlider = document.getElementById('sharpen');
const claritySlider = document.getElementById('clarity');

const grayscaleBtn = document.getElementById('grayscale');
const sepiaBtn = document.getElementById('sepia');
const invertBtn = document.getElementById('invert');
const resetBtn = document.getElementById('reset');

const rotateLeftBtn = document.getElementById('rotate-left');
const rotateRightBtn = document.getElementById('rotate-right');
const cropBtn = document.getElementById('crop-btn');

const downloadBtn = document.getElementById('download');

let img = new Image();
let filterEffects = "";
let rotation = 0;

let isCropping = false;
let cropStartX = 0, cropStartY = 0;
let cropEndX = 0, cropEndY = 0;

// --- Upload logic ---
dropArea.addEventListener('click', () => upload.click());
upload.addEventListener('change', (e) => loadImage(e.target.files[0]));

dropArea.addEventListener('dragover', (e) => { e.preventDefault(); dropArea.style.borderColor = 'blue'; });
dropArea.addEventListener('dragleave', (e) => { e.preventDefault(); dropArea.style.borderColor = '#aaa'; });
dropArea.addEventListener('drop', (e) => { e.preventDefault(); dropArea.style.borderColor = '#aaa'; loadImage(e.dataTransfer.files[0]); });

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = function(event) {
    img.src = event.target.result;
  }
  reader.readAsDataURL(file);
}

img.onload = function() {
  canvas.width = img.width > 500 ? 500 : img.width;
  canvas.height = img.height > 500 ? 500 : img.height;
  drawImage();
}

// --- Convolution helper for sharpen/clarity ---
function applyConvolution(imageData, kernel) {
  const pixels = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const copy = new Uint8ClampedArray(pixels);

  const kHalf = Math.floor(Math.sqrt(kernel.length)/2);

  for (let y = kHalf; y < height - kHalf; y++) {
    for (let x = kHalf; x < width - kHalf; x++) {
      let r=0,g=0,b=0;
      for (let ky=-kHalf; ky<=kHalf; ky++) {
        for (let kx=-kHalf; kx<=kHalf; kx++) {
          const px = ( (y+ky)*width + (x+kx) )*4;
          const k = kernel[(ky+kHalf)*3 + (kx+kHalf)];
          r += copy[px]*k;
          g += copy[px+1]*k;
          b += copy[px+2]*k;
        }
      }
      const i = (y*width+x)*4;
      pixels[i] = r;
      pixels[i+1] = g;
      pixels[i+2] = b;
    }
  }
  return imageData;
}

// --- Draw image with all filters & rotation ---
function drawImage() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(rotation * Math.PI/180);
  ctx.translate(-canvas.width/2, -canvas.height/2);
  
  ctx.filter = `
    brightness(${parseInt(brightnessSlider.value)+100}%)
    contrast(${parseInt(contrastSlider.value)+100}%)
    saturate(${parseInt(saturationSlider.value)+100}%)
    hue-rotate(${parseInt(hueSlider.value)}deg)
    blur(${parseInt(blurSlider.value)}px)
    ${filterEffects}
  `;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Apply sharpen
  if (parseFloat(sharpenSlider.value) > 0) {
    let imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const s = parseFloat(sharpenSlider.value);
    const kernel = [
      0, -s, 0,
      -s, 1+4*s, -s,
      0, -s, 0
    ];
    imageData = applyConvolution(imageData, kernel);
    ctx.putImageData(imageData, 0, 0);
  }

  // Apply clarity/texture
  if (parseFloat(claritySlider.value) > 0) {
    let imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const factor = parseFloat(claritySlider.value);
    const data = imageData.data;
    for (let i=0;i<data.length;i+=4){
      const avg = (data[i]+data[i+1]+data[i+2])/3;
      data[i] += (data[i]-avg)*factor;
      data[i+1] += (data[i+1]-avg)*factor;
      data[i+2] += (data[i+2]-avg)*factor;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Draw crop rectangle if cropping
  if (isCropping) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropStartX, cropStartY, cropEndX - cropStartX, cropEndY - cropStartY);
  }
}

// --- Sliders ---
[brightnessSlider, contrastSlider, saturationSlider, hueSlider, blurSlider, sharpenSlider, claritySlider].forEach(slider => {
  slider.addEventListener('input', drawImage);
});

// --- Filter buttons ---
grayscaleBtn.addEventListener('click', () => { filterEffects = "grayscale(100%)"; drawImage(); });
sepiaBtn.addEventListener('click', () => { filterEffects = "sepia(100%)"; drawImage(); });
invertBtn.addEventListener('click', () => { filterEffects = "invert(100%)"; drawImage(); });
resetBtn.addEventListener('click', () => {
  filterEffects = "";
  rotation = 0;
  blurSlider.value = 0;
  sharpenSlider.value = 0;
  claritySlider.value = 0;
  drawImage();
});

// --- Rotate buttons ---
rotateLeftBtn.addEventListener('click', () => { rotation -= 90; drawImage(); });
rotateRightBtn.addEventListener('click', () => { rotation += 90; drawImage(); });

// --- Drag-to-crop ---
canvas.addEventListener('mousedown', (e) => {
  isCropping = true;
  cropStartX = e.offsetX;
  cropStartY = e.offsetY;
  cropEndX = cropStartX;
  cropEndY = cropStartY;
});

canvas.addEventListener('mousemove', (e) => {
  if (isCropping) {
    cropEndX = e.offsetX;
    cropEndY = e.offsetY;
    drawImage();
  }
});

canvas.addEventListener('mouseup', () => {
  isCropping = false;
  drawImage();
});

// --- Crop button ---
cropBtn.addEventListener('click', () => {
  const x = Math.min(cropStartX, cropEndX);
  const y = Math.min(cropStartY, cropEndY);
  const width = Math.abs(cropEndX - cropStartX);
  const height = Math.abs(cropEndY - cropStartY);
  
  if (width && height) {
    const imageData = ctx.getImageData(x, y, width, height);
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);
  }
});

// --- Download ---
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'edited-image.png';
  link.href = canvas.toDataURL();
  link.click();
});
