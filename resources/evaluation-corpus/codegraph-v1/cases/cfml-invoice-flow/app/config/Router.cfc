component {

    function configure() {
        route( "/api/v1/invoices" ).withAction( "index" ).withVerbs( "GET" ).toHandler( "InvoiceHandler" ).end();
    }

}
