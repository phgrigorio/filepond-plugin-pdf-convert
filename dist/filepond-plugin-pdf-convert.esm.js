/*!
 * FilePondPluginPdfConvert 1.0.3
 * Licensed under MIT, https://opensource.org/licenses/MIT/
 * Please visit https://github.com/alexandreDavid/filepond-plugin-pdf-convert#readme for details.
 */
/* eslint-disable */

const isPdf = (file) => /pdf$/.test(file.type);

const pdfToImage = (file, type, marginHeight) => {
  const pages = [];
  const heights = [];
  let width = 0;
  let height = 0;
  let currentPage = 1;
  const scale = 1.5;

  function mergePages() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(pages[0], 0, heights[0]);
    return canvas;
  }
  return new Promise((resolve, reject) => {
    if (typeof pdfjsLib === 'undefined') {
      const message = 'The library PDF.js is required to convert PDF in image';
      console.warn(message);
      reject(message);
      return;
    }
    try {
      const fileReader = new FileReader();

      fileReader.onload = async function () {
        const typedarray = new Uint8Array(this.result);

        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        getPage();

        async function getPage() {
          const page = await pdf.getPage(currentPage);

          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const renderContext = { canvasContext: ctx, viewport: viewport };

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render(renderContext).promise;
          pages.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

          heights.push(height);
          height += canvas.height;
          if (width < canvas.width) width = canvas.width;

          // if (currentPage < pdf.numPages) {
          //   currentPage++;
          //   height += marginHeight;
          //   getPage();
          // } else {
          const blobBin = atob(canvas.toDataURL(type).split(',')[1]);
          const array = [];
          for (let i = 0; i < blobBin.length; i++) {
            array.push(blobBin.charCodeAt(i));
          }
          const blob = new Blob([new Uint8Array(array)], { type });
          resolve(new File([blob], file.name, { type }));
          // }
        }
      };

      fileReader.readAsArrayBuffer(file);
    } catch (e) {
      reject(e);
    }
  });
};

const plugin = ({ addFilter, utils }) => {
  // get quick reference to Type utils
  const { Type } = utils;

  // called for each file that is loaded
  // right before it is set to the item state
  // should return a promise
  addFilter(
    'LOAD_FILE',
    (file, { query }) =>
      new Promise((resolve, reject) => {
        if (!isPdf(file)) {
          resolve(file);
          return;
        }
        pdfToImage(
          file,
          query('GET_PDF_CONVERT_TYPE'),
          query('GET_PDF_CONVERT_MARGIN_HEIGHT')
        )
          .then(function (newFile) {
            resolve(newFile);
          })
          .catch(() => resolve(file));
      })
  );

  // expose plugin
  return {
    // default options
    options: {
      // Set type convertor
      pdfConvertType: ['image/png', Type.STRING],
      pdfConvertMarginHeight: [30, Type.NUMBER],
    },
  };
};

// fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
const isBrowser =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';
if (isBrowser) {
  document.dispatchEvent(
    new CustomEvent('FilePond:pluginloaded', { detail: plugin })
  );
}

export default plugin;
