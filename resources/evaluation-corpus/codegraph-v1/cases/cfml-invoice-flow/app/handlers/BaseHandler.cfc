component implements="IHandlerContract" {

    function respond( required any payload ) {
        return { data: arguments.payload };
    }

}
