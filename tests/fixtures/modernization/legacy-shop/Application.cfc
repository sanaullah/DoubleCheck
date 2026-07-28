component {
    this.name = "LegacyShop";
    this.datasource = "shop";
    function onApplicationStart() { application.startedAt = now(); }
    function onRequestStart() { if ( !structKeyExists( session, "userId" ) ) session.userId = 0; }
}
