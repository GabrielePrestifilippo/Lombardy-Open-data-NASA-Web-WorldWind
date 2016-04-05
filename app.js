/*jshint -W117 */

define(['./scripts/Creator'], function(DataCreator) {

    var data = new DataCreator("canvasOne");

    $("#startJson").click(function() {

        var val = $("#numberJson").val();
        var type = Number($("#type").val());
        var keyword = $("#keyword").val();

        if (!val || val < 1) {
            val = 100;
        }
        val = Number(val);
        data.create({
            number: val,
            type: type,
            keyword: keyword,
        });
    });


});