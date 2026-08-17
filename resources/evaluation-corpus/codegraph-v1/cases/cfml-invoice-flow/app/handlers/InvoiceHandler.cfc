component {

    property name="invoiceService" inject="InvoiceService";

    function index( event, rc, prc ) {
        var invoices = invoiceService.findAll();
        event.setView( "invoices/show" );
        return invoices;
    }

}
