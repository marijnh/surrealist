import { mdiTune } from "@mdi/js";
import { useStable } from "~/hooks/stable";
import { useActiveConnection } from "~/hooks/connection";
import { Panel } from "~/components/Panel";
import { useState } from "react";
import { Text } from "@mantine/core";
import { SurrealistEditor } from "~/components/SurrealistEditor";
import { useConfigStore } from "~/stores/config";

export function VariablesPane() {
	const { updateConnection } = useConfigStore.getState();
	const activeSession = useActiveConnection();

	if (!activeSession) {
		throw new Error("This should not happen");
	}

	const [isInvalid, setIsInvalid] = useState(false);

	const setVariables = useStable((content: string | undefined) => {
		try {
			const json = content || "{}";
			const parsed = JSON.parse(json);

			if (typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new TypeError("Invalid JSON");
			}

			updateConnection({
				id: activeSession.id,
				variables: json,
			});

			setIsInvalid(false);
		} catch {
			setIsInvalid(true);
		}
	});

	const jsonAlert = isInvalid ? <Text c="red">Invalid variable JSON</Text> : undefined;

	return (
		<Panel title="Variables" icon={mdiTune} rightSection={jsonAlert}>
			<SurrealistEditor
				language="json"
				value={activeSession?.variables?.toString()}
				onChange={setVariables}
				style={{
					position: "absolute",
					insetBlock: 0,
					insetInline: 24,
				}}
				options={{
					wrappingStrategy: "advanced",
					wordWrap: "on",
					suggest: {
						showProperties: false,
					}
				}}
			/>
		</Panel>
	);
}
