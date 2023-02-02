import classes from './style.module.scss';
import { ActionIcon, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { mdiAlphaSCircleOutline, mdiRefresh, mdiTable, mdiViewSequential } from "@mdi/js";
import { useEffect, useState } from "react";
import { useStable } from "~/hooks/stable";
import { getSurreal } from "~/surreal";
import { Icon } from "../../components/Icon";
import { Panel } from "../../components/Panel";
import { OpenFn } from '~/typings';
import { useIsLight } from '~/hooks/theme';

interface Table {
	name: string;
	schemafull: boolean;
}

export interface TablesPaneProps {
	isOnline: boolean;
	onSelectTable: OpenFn;
}

export function TablesPane(props: TablesPaneProps) {
	const isLight = useIsLight();
	const [tables, setTables] = useState<Table[]>([]);
	const [selectedTable, setSelectedTable] = useState<Table | null>(null);

	const selectTable = (table: Table | null) => {
		setSelectedTable(table);
		props.onSelectTable(table?.name || null);
	};

	const fetchTables = useStable(async () => {
		const surreal = getSurreal();

		if (!props.isOnline || !surreal) {
			return;
		}

		const response = await surreal.query('INFO FOR DB');
		const result = response[0].result;
		const tables = Object.keys(result.tb).map(name => ({
			name: name,
			schemafull: result.tb[name].includes('SCHEMAFULL')
		}));

		setTables(tables);
		selectTable(null);
	});

	useEffect(() => {
		setTimeout(() => {
			fetchTables();
		}, 150);
	}, [props.isOnline]);

	return (
		<Panel
			title="Tables"
			icon={mdiViewSequential}
			rightSection={
				<Group noWrap>
					<ActionIcon
						title="Refresh"
						onClick={fetchTables}
					>
						<Icon color="light.4" path={mdiRefresh} />
					</ActionIcon>
					{/* TODO Implement table creation w/ schema builder */}
					{/* <ActionIcon
						title="Create table"
						onClick={fetchTables}
					>
						<Icon color="light.4" path={mdiPlus} />
					</ActionIcon> */}
				</Group>
			}
		>
			{props.isOnline ? (
				<ScrollArea
					style={{
						position: 'absolute',
						inset: 12,
						top: 0
					}}
				>
					{tables.map((table, i) => {
						const isActive = selectedTable == table;

						return (
							<Group
								py="xs"
								px="xs"
								noWrap
								spacing="xs"
								key={table.name}
								className={classes.tableEntry}
								onClick={() => selectTable(table)}
								sx={theme => ({
									backgroundColor: isActive ? theme.fn.rgba(theme.fn.themeColor('surreal'), 0.125) : undefined,
									borderRadius: 8
								})}
							>
								<Icon
									color={isActive ? 'surreal' : isLight ? 'light.3' : 'light.5'}
									path={mdiTable}
									size="sm"
								/>

								<Text color={isActive ? (isLight ? 'black' : 'white') : (isLight ? 'light.7' : 'light.1')}>
									{table.name}
								</Text>
							</Group>
						)
					})}
				</ScrollArea>
			) : (
				<Text align="center" pt="xl" c="light.5">
					Not connected
				</Text>
			)}
		</Panel>
	)
}