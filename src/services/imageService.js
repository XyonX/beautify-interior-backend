import { insertProductImages } from "../models/imageModel.js";

export default {
  createImages: async (product, images) => {
    console.log(
      `Receiived request for processiing imge for prduct:${product}, imagges:  `,
      images
    );
    let data = [];

    for (const image of images) {
      let i = {
        product_id: product.id,
        url: image.url,
        alt_text: image.alt_text,
        sort_order: image.sort_order,
        is_main: image.is_main,
      };
      data.push(i);
    }

    insertProductImages(data);
  },
};
