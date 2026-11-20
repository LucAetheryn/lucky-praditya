
/* Supabase Storage (bucket "site-media"):
   Upload happens only inside an explicit Save by a verified admin.
   Existing Base64/URLs stay readable.
   Failed saves clean up only objects uploaded by that operation.
*/
const Store = {
  OK: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  MAX: 5 * 1024 * 1024,

  isData: u => /^data:image\//i.test(u || ""),

  isOurs: u =>
    String(u || "").startsWith(
      SB_URL + "/storage/v1/object/public/" + SB_BUCKET + "/"
    ),

  ext: t => ({
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif"
  })[t],

  async blobOf(u) {
    const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,/i.exec(u);

    if (!m) {
      throw E(
        "Unsupported image format (PNG, JPEG, WebP or GIF only).",
        "img"
      );
    }

    const type = m[1].toLowerCase();

    let raw;
    try {
      raw = atob(u.slice(u.indexOf(",") + 1));
    } catch (e) {
      throw E("Invalid Base64 image data.", "img");
    }

    const bytes = new Uint8Array(raw.length);

    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type });

    if (blob.size > Store.MAX) {
      throw E("An image is larger than 5 MB.", "img");
    }

    return { blob, type };
  },

  async put(dir, u) {
    const { blob, type } = await Store.blobOf(u);
    const c = sb();

    const path =
      `${dir}/${crypto.randomUUID()}.${Store.ext(type)}`;

    const { error } = await c.storage
      .from(SB_BUCKET)
      .upload(path, blob, {
        contentType: type,
        cacheControl: "31536000",
        upsert: false
      });

    if (error) throw error;

    return {
      path,
      url: c.storage.from(SB_BUCKET).getPublicUrl(path).data.publicUrl
    };
  },

  async externalize(cfg) {
    const up = [];

    try {
      for (const c of cfg.connections) {
        if (Store.isData(c.icon)) {
          const r = await Store.put("connections", c.icon);
          c.icon = r.url;
          up.push(r.path);
        }
      }

      for (const h of cfg.highlights) {
        if (Store.isData(h.thumb)) {
          const r = await Store.put("highlights", h.thumb);
          h.thumb = r.url;
          up.push(r.path);
        }
      }
    } catch (e) {
      await Store.rollback(up);
      throw e;
    }

    return { cfg, uploaded: up };
  },

  async rollback(paths) {
    if (paths && paths.length) {
      try {
        await sb().storage.from(SB_BUCKET).remove(paths);
      } catch (e) {
        // Preserve the original upload error.
      }
    }
  },

  paths(cfg) {
    const s = new Set();

    const add = u => {
      if (Store.isOurs(u)) {
        s.add(
          decodeURIComponent(
            u.slice(
              (SB_URL + "/storage/v1/object/public/" + SB_BUCKET + "/").length
            ).split("?")[0]
          )
        );
      }
    };

    (cfg.connections || []).forEach(c => add(c.icon));
    (cfg.highlights || []).forEach(h => add(h.thumb));

    return s;
  },

  /* Lists objects not referenced by server copy or current draft. */
  async unused(serverCfg, draftCfg) {
    const c = sb();
    const ref = new Set([
      ...Store.paths(serverCfg),
      ...Store.paths(draftCfg)
    ]);

    const out = [];
    const limit = 1000;

    for (const dir of ["connections", "highlights"]) {
      let offset = 0;

      while (true) {
        const { data, error } = await c.storage
          .from(SB_BUCKET)
          .list(dir, {
            limit,
            offset,
            sortBy: { column: "name", order: "asc" }
          });

        if (error) throw error;

        const rows = data || [];

        for (const o of rows) {
          if (
            o.name &&
            !o.name.endsWith("/") &&
            !ref.has(dir + "/" + o.name)
          ) {
            out.push({
              path: dir + "/" + o.name,
              size: (o.metadata && o.metadata.size) || 0
            });
          }
        }

        if (rows.length < limit) break;

        offset += rows.length;
      }
    }

    return out;
  },

  async remove(path) {
    const { error } = await sb()
      .storage.from(SB_BUCKET)
      .remove([path]);

    if (error) throw error;
  }
};
