(function() {
   var Scheduler = kendo.ui.Scheduler,
        SchedulerEvent = kendo.data.SchedulerEvent,
        container;

    function getDate(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    }

    function triggerTouchEvent(element, type, info) {
        info.target = element;
        return element.trigger($.Event(type, { originalEvent: { changedTouches: [ info ] }}));
    }

    module("editing", {
        setup: function() {
            kendo.UserEvents.minHold(50);

            container = $("<div>");
            container.appendTo(QUnit.fixture);

            $.fn.press = function (x, y) {
                return triggerTouchEvent(this, "touchstart", {
                    pageX: x,
                    pageY: y,
                    id: 1
                })
            }

            $.fn.move = function (x, y) {
                return triggerTouchEvent(this, "touchmove", {
                    pageX: x,
                    pageY: y,
                    id: 1
                })
            }

            $.fn.release = function (x, y) {
                return triggerTouchEvent(this, "touchend", {
                    pageX: x,
                    pageY: y,
                    id: 1
                })
            }

            $.fn.tap = function(info) {
                return this.press(10, 10).release(10, 10);
            }

        },
        teardown: function() {
            kendo.destroy(QUnit.fixture);
            kendo.UserEvents.minHold(800);
        }
    });

    function setup(options) {
        return new Scheduler(container,
            $.extend({
                mobile: "tablet",
                dataSource: [ { start: new Date(), end: new Date(), isAllDay: true, title: "my event" } ]
            }, options)
        );
    }

    test("edit form is wrapped within a view",1, function() {
        var scheduler = setup();

        scheduler.editEvent(scheduler.dataSource.at(0));

        ok(scheduler._editor.container.closest(kendo.roleSelector("view")).length);
    });

    test("editor is close on cancel",1, function() {
        var scheduler = setup();

        var close = stub(scheduler._editor, "close");

        scheduler.editEvent(scheduler.dataSource.at(0));
        scheduler.cancelEvent();

        equal(close.calls("close"), 1);
    });

    test("editable is destroyed on close",1, function() {
        var scheduler = setup();

        scheduler.editEvent(scheduler.dataSource.at(0));
        scheduler.cancelEvent();

        ok(!scheduler._editor.editable);
    });

    test("edit view is removed", 1, function() {
        var scheduler = setup();

        scheduler._editor.options.animations = {};

        scheduler.editEvent(scheduler.dataSource.at(0));
        scheduler.cancelEvent();

        equal(scheduler._editor.pane.element.find(kendo.roleSelector("view")).length, 1);
    });

    test("editing event triggers the edit event", 1, function() {
        var scheduler = setup({
            edit: function() {
                ok(true);
            }
        });

        scheduler.editEvent(scheduler.dataSource.at(0));
    });

    test("preventing the edit form opening calls cancel event",  function() {
        var scheduler = setup({
            edit: function(e) {
                e.preventDefault();
            }
        });

        var cancel = stub(scheduler, "cancelEvent");

        scheduler.editEvent(scheduler.dataSource.at(0));

        equal(cancel.calls("cancelEvent"), 2);
    });

    test("clicking cancel button calls cancelEvent", function() {
        var scheduler = setup();

        var cancel = stub(scheduler, "cancelEvent");

        scheduler.editEvent(scheduler.dataSource.at(0));

        scheduler._editor.container.find(".k-scheduler-cancel").click();

        equal(cancel.calls("cancelEvent"), 2);
    });

    test("clicking save button calls saveEvent", function() {
        var scheduler = setup();

        var save = stub(scheduler, "saveEvent");

        scheduler.editEvent(scheduler.dataSource.at(0));

        scheduler._editor.container.find(".k-scheduler-update").click();

        equal(save.calls("saveEvent"), 1);
    });

    test("edit template is initialized if set", function() {
        var scheduler = setup({
            editable: {
                template: "my custom edit form"
            }
        });

        scheduler.editEvent(scheduler.dataSource.at(0));

        equal(scheduler._editor.container.find(kendo.roleSelector("content")).text(), "my custom edit formDelete");
    });

    test("delete button is not shown for new events", function() {
        var scheduler = setup();

        var remove = stub(scheduler, "removeEvent");

        var model = scheduler.dataSource.add({});

        scheduler.editEvent(model);

        ok(!scheduler._editor.container.find(".k-scheduler-delete").length);
    });

    test("clicking the delete button within the edit form calls removeEvent", function() {
        var scheduler = setup();

        var remove = stub(scheduler, "removeEvent");

        scheduler.editEvent(scheduler.dataSource.at(0));

        scheduler._editor.container.find(".k-scheduler-delete").click();

        equal(remove.calls("removeEvent"), 1);
    });

    test("delete dialog does not show additional cancel button", function() {
        var scheduler = setup();

        var showDialog = stub(scheduler._editor, "showDialog");

        scheduler.editEvent(scheduler.dataSource.at(0));

        scheduler._editor.container.find(".k-scheduler-delete").click();
        equal(showDialog.args("showDialog")[0].buttons.length, 1);
    });

    test("tapping event calls editEvent in day view", function() {
        var scheduler = setup();

        var editEvent = stub(scheduler, "editEvent");

        scheduler.element.find(".k-event").tap();

        ok(editEvent.calls("editEvent"));
    });

    asyncTest("tap and hold on event add class to the element", function() {
        var scheduler = setup();

        var eventElement = scheduler.element.find(".k-event");

        eventElement.press(10, 10);

        setTimeout(function() {
            start();
            eventElement.release(10, 10);
            ok(eventElement.hasClass("k-event-active"));
        }, 100);
    });

    asyncTest("tap and hold on diffrent event cancel hold of the prev event", function() {
        var scheduler = setup({
                dataSource: [
                    { start: new Date(), end: new Date(), title: "my event" },
                    { start: new Date(), end: new Date(), title: "my second event" }  ]
            });

        var eventElement = scheduler.element.find(".k-event").first();

        eventElement.press(10, 10);

        setTimeout(function() {
            eventElement.release(10, 10);

            eventElement = scheduler.element.find(".k-event").last();

            eventElement.press(10, 10);

            setTimeout(function() {
                start();
                eventElement.release(10, 10);

                equal(scheduler.element.find(".k-event-active").length, 1);
                ok(eventElement.hasClass("k-event-active"));
            }, 100);
        }, 100);
    });

    asyncTest("tap and hold on event add class to the element if move is disabled", function() {
        var scheduler = setup({ editable: { move: false } });

        var eventElement = scheduler.element.find(".k-event");

        eventElement.press(10, 10);

        setTimeout(function() {
            start();
            eventElement.release(10, 10);
            ok(eventElement.hasClass("k-event-active"));
        }, 100);
    });

    asyncTest("move on diffrent event cancel hold of the prev event", function() {
        var scheduler = setup({
                dataSource: [
                    { start: new Date(), end: new Date(), title: "my event" },
                    { start: new Date(), end: new Date(), title: "my second event" }  ]
            });

        var eventElement = scheduler.element.find(".k-event").first();

        eventElement.press(10, 10);

        setTimeout(function() {
            eventElement.release(10, 10);

            var nextEventElement = scheduler.element.find(".k-event").last();

            nextEventElement.press(10, 10);
            nextEventElement.move(20, 20);

            start();
            ok(!scheduler.element.find(".k-event-active").length);

        }, 100);
    });

    module("Timezone editing", {
        setup: function() {
            var scriptTag = $("script:last");

            container = document.createElement("div");
            QUnit.fixture[0].appendChild(container);
        },
        teardown: function() {
            kendo.destroy(QUnit.fixture);
            $(".k-widget").remove();
        }
    });

    test("Render Timezone field", function() {
        var scheduler = setup(),
            event = scheduler.dataSource.data()[0],
            uid = event.uid;

        event.isAllDay = false;

        scheduler.editEvent(uid);
        var anchor = scheduler._editor.container.find("a.k-timezone-button");

        ok(anchor[0]);
        equal(anchor.text(), scheduler.options.messages.editor.noTimezone);
    });

    /*test("Render Timezone button with startTimezone id as a text", function() {
        var scheduler = setup(),
            event = scheduler.dataSource.data()[0],
            tzid = "America/Toronto",
            uid = event.uid;

        event.isAllDay = false;
        event.startTimezone = tzid;

        scheduler.editEvent(uid);

        var anchor = scheduler._editor.container.find("a.k-timezone-button");

        equal(anchor.text(), tzid);
    });*/

    test("Do not render Timezone field if isAllDay", function() {
        var scheduler = setup(),
            event = scheduler.dataSource.data()[0],
            uid = event.uid;

        event.isAllDay = true;

        scheduler.editEvent(uid);
        var anchor = scheduler._editor.container.find("a.k-timezone-button");

        ok(!anchor[0]);
    });

    test("Render start and end timezone editors", function() {
        var scheduler = setup(),
            uid = scheduler.dataSource.data()[0].uid;

        scheduler.dataSource.view()[0].isAllDay = false;

        scheduler.editEvent(uid);
        var editors = scheduler._editor.container.find("[data-role=mobiletimezoneeditor]");

        equal(editors.length, 2);
        equal(editors.eq(0).attr("data-bind"), "value:startTimezone");
        equal(editors.eq(1).attr("data-bind"), "value:endTimezone");
    });

    test("Click Timezone anchor creates timezone popup", function() {
        var scheduler = setup(),
            uid = scheduler.dataSource.data()[0].uid;

        scheduler.dataSource.view()[0].isAllDay = false;

        scheduler.editEvent(uid);
        scheduler._editor.container.find("a.k-timezone-button").click();

        var view = $(".k-scheduler-timezones");

        ok(view[0]);
    });

    test("Render popup editor with disabled checkbox", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        scheduler.dataSource.view()[0].isAllDay = false;
        scheduler.editEvent(uid);

        var anchor = scheduler._editor.container.find("a.k-timezone-button");
        anchor.click();

        var view = $(".k-scheduler-timezones");

        ok(view.find("input[type=checkbox]").prop("disabled"))
    });

    test("Show second mobiletimezoneeditor if model.endTimezone is defined", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;
        scheduler.editEvent(uid);

        model.set("endTimezone", "America/Toronto");
        var anchor = scheduler._editor.container.find("a.k-timezone-button").click();

        ok($(".k-timezone-toggle").prop("checked"))
    });

    test("Select correct timezone if startTimezone is defined", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;

        scheduler.editEvent(uid);

        model.set("startTimezone", "America/Toronto");

        var anchor = $(".k-timezone-button").click();
        var editor = $("[data-role=mobiletimezoneeditor]:first").data("kendoMobileTimezoneEditor");

        equal(editor.value(), "America/Toronto");
    });

    test("Click cancel reverts timezones to last selected", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;
        scheduler.editEvent(uid);

        $(".k-timezone-button").click();

        var editor = $("[data-role=mobiletimezoneeditor]:first").data("kendoMobileTimezoneEditor");
        editor.value("America/Toronto");
        editor.trigger("change");

        equal(model.startTimezone, "America/Toronto");

        $(".k-scheduler-timezones").parents("[data-role=view]").find(".k-scheduler-cancel").click();

        ok(!model.startTimezone);
    });

    test("Click save button updates text of the timezone button", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;
        scheduler.editEvent(uid);

        $(".k-timezone-button").click();

        var editor = $("[data-role=mobiletimezoneeditor]:first").data("kendoMobileTimezoneEditor");
        editor.value("America/Toronto");
        editor.trigger("change");

        $(".k-scheduler-timezones").parents("[data-role=view]").find(".k-scheduler-update").click();

        equal($(".k-timezone-button").text(), "America/Toronto");
    });

    test("Select start timezone enables checkbox", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;
        scheduler.editEvent(uid);

        $(".k-timezone-button").click();

        var editor = $("[data-role=mobiletimezoneeditor]:first").data("kendoMobileTimezoneEditor");
        var checkbox = $(".k-timezone-toggle");

        editor.value("America/Toronto");
        editor.trigger("change");

        ok(!checkbox.prop("disabled"));
    });

    test("Clear start timezone disables checkbox and clears end timezone", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;
        scheduler.editEvent(uid);

        $(".k-timezone-button").click();

        var start = $("[data-role=mobiletimezoneeditor]:first").data("kendoMobileTimezoneEditor");
        var end = $("[data-role=mobiletimezoneeditor]:last").data("kendoMobileTimezoneEditor");
        var checkbox = $(".k-timezone-toggle");

        start.value("America/Toronto");
        start.trigger("change");

        checkbox.click();
        end.value("America/Toronto");
        end.trigger("change");

        start.value("");
        start.trigger("change");

        ok(checkbox.prop("disabled"));
        ok(!model.endTimezone);
        ok(!end.wrapper.parent(".k-edit-field").is(":visible"));
    });

    test("Click checkbox toggles endTimezone editor widget", function() {
        var scheduler = setup(),
            model = scheduler.dataSource.data()[0],
            uid = model.uid;

        model.isAllDay = false;
        scheduler.editEvent(uid);

        $(".k-timezone-button").click();

        var start = $("[data-role=mobiletimezoneeditor]:first").data("kendoMobileTimezoneEditor");
        var end = $("[data-role=mobiletimezoneeditor]:last").data("kendoMobileTimezoneEditor");
        var checkbox = $(".k-timezone-toggle");

        start.value("America/Toronto");
        start.trigger("change");

        checkbox.triggerHandler("click");

        end.value("America/Toronto");
        end.trigger("change");

        equal(model.endTimezone, "America/Toronto");

        checkbox.triggerHandler("click");

        ok(!end.wrapper.closest(".k-edit-field").is(":visible"));
        ok(!model.endTimezone);
    });
})();
