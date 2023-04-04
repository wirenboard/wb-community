defineVirtualDevice("up_down", {
    title: "Up Down Value",
    cells: {
        Value: {
            title: "Value",
            type: "value",
            value: 20,
            order: 1
        },
        Up: {
            title: "Up",
            type: "pushbutton",
            order: 2
        },
        Down: {
            title: "Down",
            type: "pushbutton",
            order: 3
        },

    }
})

defineRule("test_whenChanged", {
    whenChanged: ["up_down/Up", "up_down/Down"],
    then: function (newValue, devName, cellName) {
        oldValue = dev["up_down/Value"]

        dev["up_down/Value"] = up_down_value(oldValue, cellName, 1)
    }
});

function up_down_value(value, direction, step) {
    switch (direction) {
        case "Up":
            newValue = value + step
            break;
        case "Down":
            newValue = value - step
            break;
    }
    return newValue
}