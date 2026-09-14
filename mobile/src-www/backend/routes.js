// Photonic mobile — API route registry
"use strict";

(function () {
  var H = self.ApiHandlers;

  // Pattern order matters: more specific patterns first.
  // /api/photos/geo/bounds before /api/photos/geo before /api/photos/{id}
  // /api/photos/{id}/... before /api/photos/bulk-...

  self.ApiRoutes = {
    GET: [
      // Photo list & filters
      [/^\/api\/photos$/,                H.listPhotos],
      [/^\/api\/filters$/,              H.getFilters],

      // Geo
      [/^\/api\/photos\/geo\/bounds$/,  H.geoBounds],
      [/^\/api\/photos\/geo$/,          H.geoPhotos],

      // Location status (before /api/photos/{id} to avoid regex conflict)
      [/^\/api\/photos\/location-status$/, H.locationStatus],

      // Photo detail
      [/^\/api\/photos\/(\d+)$/,        H.getPhoto],

      // Photo sub-resources
      [/^\/api\/photos\/(\d+)\/tags$/,          H.photoTags],
      [/^\/api\/photos\/(\d+)\/collections$/,   H.photoCollections],

      // Folders
      [/^\/api\/folders$/,               H.listFolders],
      [/^\/api\/folders\/tree$/,         H.listFoldersTree],
      [/^\/api\/folders\/browse$/,       H.browseFolder],

      // Scan
      [/^\/api\/scan\/status$/,          H.scanStatus],

      // Collections
      [/^\/api\/collections$/,           H.listCollections],
      [/^\/api\/collections\/tree$/,     H.listCollectionsTree],
      [/^\/api\/collections\/browse$/,   H.browseCollections],

      // Tags
      [/^\/api\/tags$/,                  H.listTags],
      [/^\/api\/tags\/browse$/,          H.browseTags],

      // Countries & cameras
      [/^\/api\/countries$/,             H.listCountries],
      [/^\/api\/cameras\/browse$/,       H.browseCameras],

      // Stats, status, changelog
      [/^\/api\/stats$/,                 H.getStats],
      [/^\/api\/status$/,                H.getStatus],
      [/^\/api\/changelog$/,             H.getChangelog],

      // Settings
      [/^\/api\/settings\/language$/,    H.getLanguageSetting],
      [/^\/api\/settings\/telemetry$/,   H.getTelemetrySetting],

      // Cleaning
      [/^\/api\/cleaning\/status$/,      H.cleaningStatus],
      [/^\/api\/cleaning\/duplicates$/,  H.cleaningDuplicates],
      [/^\/api\/cleaning\/blurry$/,      H.cleaningBlurry],
      [/^\/api\/cleaning\/similar$/,     H.cleaningSimilar],
      [/^\/api\/cleaning\/bad$/,         H.cleaningBad],

      // Sponsors, update
      [/^\/api\/sponsors$/,              H.getSponsors],
      [/^\/api\/update\/status$/,        H.getUpdateStatus]
    ],

    POST: [
      // Photo sub-resources (IDs first to avoid ambiguity)
      [/^\/api\/photos\/(\d+)\/rate$/,              H.ratePhoto],
      [/^\/api\/photos\/(\d+)\/rotate$/,            H.rotatePhoto],
      [/^\/api\/photos\/(\d+)\/open$/,              H.openPhoto],
      [/^\/api\/photos\/(\d+)\/reveal$/,            H.revealPhoto],
      [/^\/api\/photos\/(\d+)\/tags$/,              H.addTagToPhoto],
      [/^\/api\/photos\/(\d+)\/collections$/,       H.addCollectionToPhoto],

      // Photo bulk operations (before set-location to avoid /api/photos/s... matching)
      [/^\/api\/photos\/bulk-tags$/,                H.bulkAddTag],
      [/^\/api\/photos\/bulk-collections$/,         H.bulkAddToCollection],
      [/^\/api\/photos\/bulk-hide$/,                H.bulkHide],

      // Photo set-location
      [/^\/api\/photos\/set-location$/,             H.setLocation],

      // Folders
      [/^\/api\/folders$/,                          H.addFolder],

      // Scan
      [/^\/api\/scan$/,                             H.scanFolder],
      [/^\/api\/scan\/cancel$/,                     H.cancelScan],

      // Collections
      [/^\/api\/collections$/,                      H.createCollection],

      // Tags
      [/^\/api\/tags$/,                             H.createTag],

      // Settings
      [/^\/api\/settings\/language$/,               H.setLanguageSetting],
      [/^\/api\/settings\/telemetry$/,              H.setTelemetrySetting],

      // Cleaning
      [/^\/api\/cleaning\/analyze$/,                H.cleaningAnalyze],
      [/^\/api\/cleaning\/delete$/,                 H.cleaningDelete],

      // Update
      [/^\/api\/update\/check$/,                    H.checkUpdate]
    ],

    PUT: [
      // Collections
      [/^\/api\/collections\/(\d+)$/,               H.updateCollection],

      // Tags
      [/^\/api\/tags\/(\d+)$/,                      H.updateTag]
    ],

    PATCH: [
      // Folders
      [/^\/api\/folders\/(\d+)$/,                   H.updateFolder],

      // Tags
      [/^\/api\/tags\/(\d+)$/,                      H.updateTag]
    ],

    DELETE: [
      // Folders
      [/^\/api\/folders\/(\d+)$/,                   H.deleteFolder],

      // Collections
      [/^\/api\/collections\/(\d+)$/,               H.deleteCollection],

      // Tags
      [/^\/api\/tags\/(\d+)$/,                      H.deleteTag],

      // Photo tags & collections (more specific first)
      [/^\/api\/photos\/(\d+)\/tags\/(\d+)$/,       H.removeTagFromPhoto],
      [/^\/api\/photos\/(\d+)\/collections\/(\d+)$/, H.removeCollectionFromPhoto]
    ]
  };
})();
