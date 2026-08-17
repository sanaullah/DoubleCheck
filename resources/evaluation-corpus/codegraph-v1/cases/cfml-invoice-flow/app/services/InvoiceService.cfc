component {

    property name="invoiceRepository" inject="InvoiceRepository";

    function findAll() {
        return invoiceRepository.findAll();
    }

}
