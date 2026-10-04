import logging

import pytest

from app.validation.catalog import ISSUE_DEFINITIONS
from app.validation.examples import (
    disconnected_data_source,
    duplicate_edge_id,
    duplicate_handle_id,
    duplicate_node_id,
    empty_workflow,
    handles_do_not_match_catalog,
    incompatible_handle_types,
    input_already_connected,
    invalid_handle_direction,
    open_required_input,
    open_required_output,
    self_connected_transform,
    several_independent_failures,
    two_node_cycle,
    two_separate_pipelines,
    unknown_handle,
    unknown_node,
    valid_pipeline,
)
from app.validation.service import collect_validation_issues, validate_workflow

# Every placeholder either template may name, so a typo in the catalog shows up
# here instead of as a gap in a sentence a user reads.
EVERY_MESSAGE_VALUE = {
    "node_id": "transform-1",
    "edge_id": "edge-1",
    "handle_id": "dataset",
    "node_type": "Transform",
    "node_label": "Transform Dataset",
    "handle_label": "Prepared rows",
    "source_label": "Raw rows",
    "target_label": "Prepared rows",
    "source_node_label": "Load Dataset",
    "target_node_label": "Transform Dataset",
    "source_type": "Dataset",
    "target_type": "Model",
}


def reported_codes(workflow):
    return [issue.code for issue in collect_validation_issues(workflow)]


def issue_codes(issues):
    return [issue.code for issue in issues]


def test_valid_pipeline_has_nothing_to_report():
    result = validate_workflow(valid_pipeline())
    assert result.valid is True
    assert result.errors == []
    assert result.warnings == []


def test_empty_workflow_is_valid():
    assert reported_codes(empty_workflow()) == []


def test_output_label_can_differ_from_the_catalog():
    pipeline = valid_pipeline()
    data_source = pipeline.nodes[0]
    renamed_output = data_source.data.outputs[0].model_copy(
        update={"label": "Raw rows"}
    )
    renamed_source = data_source.model_copy(
        update={
            "data": data_source.data.model_copy(update={"outputs": [renamed_output]})
        }
    )
    renamed_pipeline = pipeline.model_copy(
        update={"nodes": [renamed_source, *pipeline.nodes[1:]]}
    )
    assert reported_codes(renamed_pipeline) == []


def test_two_separate_pipelines_are_valid():
    assert reported_codes(two_separate_pipelines()) == []


@pytest.mark.parametrize(
    ("workflow_builder", "expected_codes"),
    [
        (disconnected_data_source, ["REQUIRED_OUTPUT_DISCONNECTED"]),
        (self_connected_transform, ["CYCLE_DETECTED"]),
        (two_node_cycle, ["CYCLE_DETECTED"]),
        (open_required_input, ["REQUIRED_INPUT_DISCONNECTED"]),
        (open_required_output, ["REQUIRED_OUTPUT_DISCONNECTED"]),
            (
                input_already_connected,
                ["INPUT_ALREADY_CONNECTED", "REQUIRED_OUTPUT_DISCONNECTED"],
            ),
        (
            incompatible_handle_types,
            ["INCOMPATIBLE_HANDLE_TYPES", "REQUIRED_OUTPUT_DISCONNECTED"],
        ),
        (unknown_node, ["UNKNOWN_NODE"]),
        (
            unknown_handle,
            ["UNKNOWN_HANDLE", "REQUIRED_OUTPUT_DISCONNECTED"],
        ),
        (
            invalid_handle_direction,
            ["INVALID_HANDLE_DIRECTION", "REQUIRED_OUTPUT_DISCONNECTED"],
        ),
        (duplicate_edge_id, ["DUPLICATE_EDGE_ID"]),
        (
            duplicate_node_id,
            [
                "DUPLICATE_NODE_ID",
                "REQUIRED_OUTPUT_DISCONNECTED",
                "REQUIRED_OUTPUT_DISCONNECTED",
            ],
        ),
        (
            duplicate_handle_id,
            [
                "DUPLICATE_HANDLE_ID",
                "HANDLES_DO_NOT_MATCH_CATALOG",
                "REQUIRED_OUTPUT_DISCONNECTED",
            ],
        ),
        (handles_do_not_match_catalog, ["HANDLES_DO_NOT_MATCH_CATALOG"]),
        (
            several_independent_failures,
            [
                "INCOMPATIBLE_HANDLE_TYPES",
                "REQUIRED_INPUT_DISCONNECTED",
                "REQUIRED_OUTPUT_DISCONNECTED",
                "REQUIRED_OUTPUT_DISCONNECTED",
                "CYCLE_DETECTED",
            ],
        ),
    ],
)
def test_validation_reports_each_expected_code(workflow_builder, expected_codes):
    assert reported_codes(workflow_builder()) == expected_codes


def test_a_broken_document_reports_errors_and_a_half_built_one_reports_warnings():
    result = validate_workflow(several_independent_failures())
    assert result.valid is False
    assert issue_codes(result.errors) == [
        "INCOMPATIBLE_HANDLE_TYPES",
        "CYCLE_DETECTED",
    ]
    assert issue_codes(result.warnings) == [
        "REQUIRED_INPUT_DISCONNECTED",
        "REQUIRED_OUTPUT_DISCONNECTED",
        "REQUIRED_OUTPUT_DISCONNECTED",
    ]


def test_a_warning_on_its_own_still_makes_the_workflow_invalid():
    result = validate_workflow(open_required_output())
    assert result.valid is False
    assert result.errors == []
    assert issue_codes(result.warnings) == ["REQUIRED_OUTPUT_DISCONNECTED"]


def test_a_node_connected_to_itself_is_a_loop():
    self_connection = validate_workflow(self_connected_transform())
    assert issue_codes(self_connection.errors) == ["CYCLE_DETECTED"]
    assert self_connection.warnings == []


def test_duplicate_ids_are_errors_not_warnings():
    result = validate_workflow(duplicate_node_id())
    assert issue_codes(result.errors) == ["DUPLICATE_NODE_ID"]
    assert issue_codes(result.warnings) == [
        "REQUIRED_OUTPUT_DISCONNECTED",
        "REQUIRED_OUTPUT_DISCONNECTED",
    ]


def test_the_returned_message_names_labels_and_the_logged_one_names_ids(caplog):
    with caplog.at_level(logging.WARNING, logger="app.validation.service"):
        result = validate_workflow(incompatible_handle_types())

    incompatible_issue = result.errors[0]
    assert incompatible_issue.code == "INCOMPATIBLE_HANDLE_TYPES"
    assert incompatible_issue.severity == "error"
    assert incompatible_issue.edge_id == "edge-bad"
    assert "Train Model" in incompatible_issue.message
    assert "Transform Dataset" in incompatible_issue.message
    assert "edge-bad" not in incompatible_issue.message

    logged_lines = "\n".join(caplog.messages)
    assert 'Edge "edge-bad" connects a Model output to a Dataset input.' in logged_lines
    assert "Train Model" not in logged_lines


def test_an_error_is_logged_as_an_error_and_a_warning_as_a_warning(caplog):
    with caplog.at_level(logging.WARNING, logger="app.validation.service"):
        validate_workflow(several_independent_failures())

    logged_levels_by_code = {
        record.message.split(":")[0]: record.levelname for record in caplog.records
    }
    assert logged_levels_by_code["INCOMPATIBLE_HANDLE_TYPES"] == "ERROR"
    assert logged_levels_by_code["CYCLE_DETECTED"] == "ERROR"
    assert logged_levels_by_code["REQUIRED_OUTPUT_DISCONNECTED"] == "WARNING"


def test_the_returned_issue_carries_the_user_message():
    result = validate_workflow(open_required_output())
    open_output_issue = result.warnings[0]
    assert open_output_issue.severity == "warning"
    assert open_output_issue.message == (
        'The Dataset output on "Transform Dataset" still needs a connection.'
    )
    assert open_output_issue.node_id == "transform-1"
    assert open_output_issue.path == "nodes[1]"


@pytest.mark.parametrize("issue_code", list(ISSUE_DEFINITIONS))
def test_every_issue_renders_both_messages(issue_code):
    definition = ISSUE_DEFINITIONS[issue_code]
    assert definition.log_template.format(**EVERY_MESSAGE_VALUE)
    assert definition.user_template.format(**EVERY_MESSAGE_VALUE)
