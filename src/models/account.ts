export interface AccountNode {
	name: string;
	fullName: string | null;
	children: AccountNode[];
}
